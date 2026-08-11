/**
 * Meta Pixel (browser-side) event layer for the USA funnel.
 *
 * The pixel id defaults to the live Appex pixel (it's public), so tracking is on
 * by default in production. To avoid polluting production conversion data, events
 * are suppressed in DEV builds unless a test event code is set. Nothing here ever
 * throws, so the funnel keeps working even if the pixel fails to load.
 *
 * Every conversion event generates a stable `event_id` and reads the Meta
 * `_fbp` / `_fbc` cookies so the SAME event sent server-side (Conversions API,
 * e.g. Purchase) can be **deduplicated** by Meta against the browser event.
 * See `backend/src/services/meta-capi.service.ts` for the server half.
 *
 * Funnel → Meta event mapping (matches the funnel spec table):
 *   Any screen        → PageView         (trackPageView)
 *   Landing / course  → ViewContent      (trackViewContent)
 *   Quiz started      → QuizStart custom (trackQuizStart)
 *   Quiz completed    → QuizComplete     (trackQuizComplete)
 *   Left email        → Lead             (trackLead)
 *   Opened paywall/pay→ InitiateCheckout (trackInitiateCheckout)
 *   Paid              → Purchase         (server-side, CAPI — NOT here)
 */

import { getAttributionParams, getAttribution, getAnonId, getSessionId } from './attribution'

type FbqFn = ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string }

declare global {
  interface Window {
    fbq?: FbqFn
    _fbq?: FbqFn
  }
}

/**
 * Live Appex Meta Pixel id. Public by nature (embedded in client HTML), so it's
 * safe as a baked-in default — every deploy tracks with zero env config.
 * Override per-environment (e.g. a staging pixel) via VITE_META_PIXEL_ID.
 */
const DEFAULT_PIXEL_ID = '1766890887825527'

const PIXEL_ID =
  (import.meta.env.VITE_META_PIXEL_ID as string | undefined)?.trim() || DEFAULT_PIXEL_ID
const TEST_EVENT_CODE =
  (import.meta.env.VITE_META_TEST_EVENT_CODE as string | undefined)?.trim() || null

/**
 * Whether events should actually fire. Suppressed in DEV builds (so local/QA
 * traffic doesn't pollute the production pixel) unless a test event code is set,
 * which routes those events to the Events Manager test stream instead.
 */
const TRACKING_ENABLED = Boolean(PIXEL_ID) && (!import.meta.env.DEV || Boolean(TEST_EVENT_CODE))

/** True when the pixel is configured and events are allowed to fire. */
export function isMetaPixelEnabled(): boolean {
  return TRACKING_ENABLED
}

let initialized = false

/**
 * Injects the Meta Pixel base snippet once and calls `fbq('init', …)`.
 * Idempotent and no-op when the pixel id is unset (dev / preview).
 */
export function initMetaPixel(): void {
  if (initialized || !TRACKING_ENABLED || typeof window === 'undefined') return
  initialized = true

  /* Standard Meta Pixel bootstrap, adapted to TS. Queues calls until fbevents loads. */
  const w = window
  if (!w.fbq) {
    const fbq: FbqFn = function (...args: unknown[]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(fbq as any).callMethod
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (fbq as any).callMethod.apply(fbq, args)
        : (fbq.queue = fbq.queue || []).push(args)
    }
    w.fbq = fbq
    if (!w._fbq) w._fbq = fbq
    fbq.queue = []
    fbq.loaded = true
    fbq.version = '2.0'

    const script = document.createElement('script')
    script.async = true
    script.src = 'https://connect.facebook.net/en_US/fbevents.js'
    const first = document.getElementsByTagName('script')[0]
    first?.parentNode?.insertBefore(script, first)
  }

  w.fbq?.('init', PIXEL_ID)
}

/** Reads a browser cookie by name (used for `_fbp` / `_fbc`). */
function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

/** Meta attribution cookies the Conversions API needs to match browser ↔ server. */
export function getMetaBrowserIds(): { fbp: string | null; fbc: string | null } {
  const fbp = readCookie('_fbp')
  let fbc = readCookie('_fbc')

  // If Meta's `_fbc` cookie isn't set, synthesize it in Meta's documented format
  // `fb.1.<clickTime>.<fbclid>`. Prefer the URL fbclid (fresh click), else fall
  // back to the FIRST-TOUCH fbclid + its capture time from attribution — the
  // URL query is already gone by the paywall/checkout, where this is read.
  if (!fbc) {
    try {
      const urlFbclid = new URLSearchParams(window.location.search).get('fbclid')
      if (urlFbclid) {
        fbc = `fb.1.${Date.now()}.${urlFbclid}`
      } else {
        const attr = getAttribution()
        if (attr.fbclid) {
          fbc = `fb.1.${attr.fbclid_ts ?? Date.now()}.${attr.fbclid}`
        }
      }
    } catch {
      /* ignore */
    }
  }

  return { fbp, fbc }
}

/** Generates a stable event id shared between the browser event and its CAPI twin. */
export function newEventId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * SHA-256 hex, matching how the server hashes the same fields
 * (meta-capi.service.ts) so browser and CAPI produce identical values for one
 * person. Normalises first — Meta requires trimmed lowercase before hashing, and
 * a mismatched normalisation is indistinguishable from a wrong email: it simply
 * fails to match and silently costs match quality.
 *
 * Returns null rather than throwing where SubtleCrypto is unavailable (it needs a
 * secure context), so a plain-HTTP preview degrades to no advanced matching
 * instead of breaking the pixel.
 */
async function sha256Hex(value: string): Promise<string | null> {
  try {
    const normalised = value.trim().toLowerCase()
    if (!normalised) return null
    const subtle = globalThis.crypto?.subtle
    if (!subtle) return null
    const bytes = new TextEncoder().encode(normalised)
    const digest = await subtle.digest('SHA-256', bytes)
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    return null
  }
}

/**
 * Re-initialises the pixel with Advanced Matching once the visitor identifies
 * themselves in the quiz.
 *
 * Match quality sat at 6.1/10 because the browser pixel sent no identifiers at
 * all — only the server-side Purchase did. Meta matches a browser event to a
 * person using whatever `fbq('init', …)` was given, so passing the hashed email
 * lifts every subsequent browser event, not just the conversion.
 *
 * ALWAYS hashed here, never raw: `fbq` accepts plaintext and hashes it itself,
 * but that would put the visitor's email address into a third-party request from
 * our page. Hashing first keeps the plaintext on our side and is what the
 * server already does, so the two agree.
 *
 * Calling `init` again with the same pixel id updates its user data rather than
 * creating a second pixel — this does NOT double-count events.
 */
export async function setMetaUserData(input: {
  email?: string | null
  name?: string | null
  externalId?: string | null
}): Promise<void> {
  if (!TRACKING_ENABLED || typeof window === 'undefined' || !window.fbq) return
  try {
    const userData: Record<string, string> = {}

    const em = input.email ? await sha256Hex(input.email) : null
    if (em) userData.em = em

    // First name only: Meta expects `fn` to be the given name, and sending a
    // full "First Last" string hashes to something that matches nobody.
    const first = input.name?.trim().split(/\s+/)[0]
    const fn = first ? await sha256Hex(first) : null
    if (fn) userData.fn = fn

    // Our own anon id — not PII, so it is sent as-is per Meta's spec for
    // external_id, and lets Meta stitch this browser to the CAPI events.
    const externalId = input.externalId ?? getAnonId()
    if (externalId) userData.external_id = externalId

    if (!Object.keys(userData).length) return
    window.fbq('init', PIXEL_ID, userData)
  } catch {
    /* advanced matching is an optimisation; never break tracking for it */
  }
}

/**
 * Re-applies Advanced Matching from the stored quiz answers on a fresh page load.
 *
 * The email is captured mid-quiz, but the paywall, checkout and success page are
 * separate routes — a reload (or Stripe returning the buyer) starts a new page
 * with an un-identified pixel. Without this, exactly the events furthest down the
 * funnel, the ones worth optimising for, would be the ones sent unmatched.
 *
 * Reads the same `appexQuiz` blob QuizContext persists, so there is no second
 * copy of the email to keep in sync.
 */
export function restoreMetaUserData(): void {
  if (!TRACKING_ENABLED || typeof window === 'undefined') return
  try {
    const raw = sessionStorage.getItem('appexQuiz')
    if (!raw) return
    const parsed = JSON.parse(raw) as { answers?: { email?: string; name?: string } }
    const email = parsed.answers?.email
    if (!email) return
    void setMetaUserData({ email, name: parsed.answers?.name })
  } catch {
    /* storage disabled or malformed — matching simply stays off */
  }
}

type TrackOptions = { eventId?: string }

/**
 * Builds the `fbq('track'|'trackCustom', …)` options object. Only `eventID` (for
 * browser↔server dedup) belongs here — the browser pixel has no `test_event_code`
 * param (Test Events matches browser hits by pixel id automatically); that code is
 * a Conversions API concept, applied server-side in meta-capi.service.ts.
 */
function trackOptions(eventId?: string): Record<string, unknown> | undefined {
  if (!eventId) return undefined
  return { eventID: eventId }
}

/** Merges captured creative/UTM attribution into every event's params. */
function withAttribution(params?: Record<string, unknown>): Record<string, unknown> {
  return { ...getAttributionParams(), ...(params ?? {}) }
}

/** Fires a standard Meta event; no-op when the pixel is disabled. */
function track(
  event: string,
  params?: Record<string, unknown>,
  options?: TrackOptions
): void {
  if (!TRACKING_ENABLED || typeof window === 'undefined' || !window.fbq) return
  window.fbq('track', event, withAttribution(params), trackOptions(options?.eventId))
}

/** Fires a custom (non-standard) Meta event; no-op when the pixel is disabled. */
function trackCustom(
  event: string,
  params?: Record<string, unknown>,
  options?: TrackOptions
): void {
  if (!TRACKING_ENABLED || typeof window === 'undefined' || !window.fbq) return
  window.fbq('trackCustom', event, withAttribution(params), trackOptions(options?.eventId))
}

// ─── Funnel event helpers ──────────────────────────────────────────────────

/**
 * A once-per-session event id, e.g. `QuizStart_sess-abc`.
 *
 * Deliberately DERIVED rather than random. A fresh uuid per call would satisfy
 * "every event has an eventID" while deduplicating nothing: Meta collapses two
 * hits only when they share both name and id, so a random id guarantees they
 * never match. Keying on the session id means a genuine re-fire of a
 * once-per-funnel milestone — a reload, a remount, a restored tab — collapses
 * into the single event it actually represents.
 *
 * Only for milestones that should occur once per funnel run. PageView and
 * ViewContent are deliberately excluded: they legitimately repeat per route, and
 * a stable id would make Meta discard the later, real ones.
 */
function sessionEventId(eventName: string): string {
  return `${eventName}_${getSessionId()}`
}

/** PageView — every route. Intentionally un-deduplicated (fires per route). */
export function trackPageView(): void {
  track('PageView')
}

/** ViewContent — opened a landing / course page. Repeats per page by design. */
export function trackViewContent(params?: { content_name?: string }): void {
  track('ViewContent', params)
}

/** QuizStart (custom) — first quiz answer. */
export function trackQuizStart(): void {
  trackCustom('QuizStart', undefined, { eventId: sessionEventId('QuizStart') })
}

/** QuizComplete (custom) — reached the last quiz screen. */
export function trackQuizComplete(): void {
  trackCustom('QuizComplete', undefined, { eventId: sessionEventId('QuizComplete') })
}

/** Lead — submitted email in the quiz. */
export function trackLead(): void {
  track('Lead', undefined, { eventId: sessionEventId('Lead') })
}

/** CompleteRegistration — submitted name (registration intent) after email. */
export function trackCompleteRegistration(): void {
  track('CompleteRegistration', undefined, {
    eventId: sessionEventId('CompleteRegistration'),
  })
}

/**
 * InitiateCheckout — opened Stripe checkout from the paywall. Returns the
 * generated `event_id` so the caller can forward it to the backend, letting
 * the server-side Purchase share the same id for deduplication.
 */
export function trackInitiateCheckout(params: {
  value: number
  currency: string
  plan: string
}): string {
  const eventId = newEventId()
  track(
    'InitiateCheckout',
    {
      value: params.value,
      currency: params.currency,
      content_type: 'product',
      content_ids: [params.plan],
      content_name: `Appex ${params.plan}`,
    },
    { eventId }
  )
  return eventId
}

/**
 * Deterministic Purchase event id shared between the browser Purchase (success
 * page) and the server CAPI Purchase. Meta only dedups events of the SAME name
 * with the same id — so both Purchases must derive the id identically from the
 * Stripe session id. (Sharing the InitiateCheckout id would NOT dedup a Purchase.)
 */
export function purchaseEventId(stripeSessionId: string): string {
  return `purchase_${stripeSessionId}`
}

/**
 * Purchase (browser) — fired on the post-payment success page. Shares its
 * `eventID` (derived from the Stripe session id) with the server CAPI Purchase
 * so Meta deduplicates the two into one conversion.
 */
export function trackPurchase(params: {
  stripeSessionId: string
  value: number
  currency: string
  plan?: string
}): void {
  track(
    'Purchase',
    {
      value: params.value,
      currency: params.currency,
      ...(params.plan
        ? { content_type: 'product', content_ids: [params.plan], content_name: `Appex ${params.plan}` }
        : {}),
    },
    { eventId: purchaseEventId(params.stripeSessionId) }
  )
}
