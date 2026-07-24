/**
 * GA4 (Google Analytics 4, gtag.js) browser event layer for the USA funnel.
 *
 * Sends to the dedicated landing stream **G-9VSNWFGHR6** ("Appex Landing"), a
 * GA4 web stream created directly in GA4 (NOT Firebase-managed) — so we use
 * gtag.js directly rather than the Firebase SDK, which would route by Firebase
 * appId to a different stream. Runs in parallel to the Meta Pixel.
 *
 * The Measurement ID is public (embedded in client HTML), so it's baked in as
 * the default; override per-environment via VITE_GA4_MEASUREMENT_ID. Suppressed
 * in DEV builds unless VITE_GA4_DEBUG=true, so local/QA traffic doesn't pollute
 * production analytics. Nothing here ever throws.
 *
 * `send_page_view:false` makes RouteAnalytics the single source of page_view
 * (avoids a double-count with gtag's automatic one), matching the Meta layer.
 *
 * Funnel → GA4 event mapping (parallels the Meta table):
 *   Any screen        → page_view
 *   Landing / course  → view_item
 *   Quiz started      → quiz_start      (custom)
 *   Quiz completed    → quiz_complete   (custom)
 *   Left email        → generate_lead
 *   Opened pay        → begin_checkout  (value+currency)
 *   Paid              → purchase        (browser here + server Measurement Protocol)
 *
 * The server-side `purchase` (backend/src/services/ga4-mp.service.ts) reuses the
 * same GA4 `client_id` captured here so both hits attribute to one user/session.
 */

import { getEventEnvelope } from './attribution'

type GtagFn = (...args: unknown[]) => void

declare global {
  interface Window {
    gtag?: GtagFn
    dataLayer?: unknown[]
  }
}

/**
 * Live "Appex Landing" GA4 Measurement ID. Public (ships in client HTML), so safe
 * as a baked-in default — override with VITE_GA4_MEASUREMENT_ID for a staging stream.
 */
const DEFAULT_MEASUREMENT_ID = 'G-9VSNWFGHR6'

const MEASUREMENT_ID =
  (import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined)?.trim() || DEFAULT_MEASUREMENT_ID
/** Opt-in flag to allow GA4 to fire in DEV builds (routes to GA4 DebugView). */
const DEBUG_ENABLED = (import.meta.env.VITE_GA4_DEBUG as string | undefined)?.trim() === 'true'

/**
 * Whether GA4 events should fire: a Measurement ID is set, and we're not in a
 * DEV build (unless the debug flag opts in). Mirrors the Meta layer's gating.
 */
const TRACKING_ENABLED = Boolean(MEASUREMENT_ID) && (!import.meta.env.DEV || DEBUG_ENABLED)

/** True when GA4 is configured and events are allowed to fire. */
export function isGa4Enabled(): boolean {
  return TRACKING_ENABLED
}

let initialized = false

/**
 * Injects the gtag.js snippet once and configures the stream. Idempotent; no-op
 * when disabled. `send_page_view:false` — route changes are the single source of
 * page_view (fired from RouteAnalytics).
 */
export function initGa4(): void {
  if (initialized || !TRACKING_ENABLED || typeof window === 'undefined') return
  initialized = true

  const w = window
  w.dataLayer = w.dataLayer || []
  // MUST push the `arguments` object (array-like), NOT a real Array — gtag.js's
  // dataLayer processor only executes entries where
  // `toString.call(entry) === "[object Arguments]"`. A rest-param `...args` would
  // build a true Array, which gtag silently ignores. Match Google's snippet.
  function gtag() {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments)
  }
  w.gtag = gtag as unknown as GtagFn

  gtag('js', new Date())
  gtag('config', MEASUREMENT_ID, {
    send_page_view: false,
    ...(DEBUG_ENABLED ? { debug_mode: true } : {}),
  })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`
  const first = document.getElementsByTagName('script')[0]
  first?.parentNode?.insertBefore(script, first)
}

/** Stamps the standard envelope (anon_id/session_id/timestamp + attribution). */
function withAttribution(params?: Record<string, unknown>): Record<string, unknown> {
  return { ...getEventEnvelope(), ...(params ?? {}) }
}

/** Fires a GA4 event via gtag; no-op when disabled or gtag isn't ready. */
function event(name: string, params?: Record<string, unknown>): void {
  if (!TRACKING_ENABLED || typeof window === 'undefined' || !window.gtag) return
  window.gtag('event', name, withAttribution(params))
}

/**
 * Reads the GA4 `client_id` for the configured stream so the server-side
 * `purchase` (Measurement Protocol) attributes to the same user. Resolves null
 * when disabled / not ready / on timeout. Never rejects.
 */
export function getGa4ClientId(timeoutMs = 800): Promise<string | null> {
  return new Promise((resolve) => {
    if (!TRACKING_ENABLED || typeof window === 'undefined' || !window.gtag) {
      resolve(null)
      return
    }
    let done = false
    const finish = (val: string | null) => {
      if (done) return
      done = true
      resolve(val)
    }
    const timer = window.setTimeout(() => finish(null), timeoutMs)
    try {
      window.gtag('get', MEASUREMENT_ID, 'client_id', (id: unknown) => {
        window.clearTimeout(timer)
        finish(typeof id === 'string' && id ? id : null)
      })
    } catch {
      window.clearTimeout(timer)
      finish(null)
    }
  })
}

// ─── Funnel event helpers ──────────────────────────────────────────────────

/**
 * page_view — every route. Sends the FULL URL as `page_location` (not just the
 * path) so GA4 reads the utm_* query for native Session source/medium/campaign
 * attribution (GA4 derives traffic source from page_location/referrer, not from
 * custom event params).
 */
export function ga4PageView(path?: string): void {
  const params: Record<string, unknown> = {}
  if (typeof window !== 'undefined') {
    params.page_location = window.location.href
    params.page_path = path ?? window.location.pathname
  } else if (path) {
    params.page_path = path
  }
  event('page_view', params)
}

/** landing_view — opened the landing (spec funnel step 1). */
export function ga4LandingView(params?: { item_name?: string }): void {
  event('landing_view', params?.item_name ? { item_name: params.item_name } : undefined)
}

/** quiz_start (custom) — first quiz answer. */
export function ga4QuizStart(): void {
  event('quiz_start')
}

/** quiz_complete (custom) — reached the last quiz screen. */
export function ga4QuizComplete(): void {
  event('quiz_complete')
}

/** quiz_step — fired on every quiz screen view (drop-off funnel by step_index). */
export function ga4QuizStep(params: {
  step_index: number
  step_id: string
  section: string
  type: string
}): void {
  event('quiz_step', params)
}

/** quiz_answer — fired when the user picks an answer on a question screen. */
export function ga4QuizAnswer(params: { step_id: string; answer: unknown }): void {
  event('quiz_answer', { step_id: params.step_id, answer: params.answer })
}

/** lead — submitted email in the quiz (spec funnel step 34). */
export function ga4Lead(): void {
  event('lead')
}

/** name_submit — submitted name (spec funnel step 35). */
export function ga4NameSubmit(): void {
  event('name_submit')
}

/** plan_view — reached the personal-plan reveal (spec funnel step 36). */
export function ga4PlanView(): void {
  event('plan_view')
}

/** paywall_view — paywall screen shown (spec funnel step 38). */
export function ga4PaywallView(): void {
  event('paywall_view')
}

/** checkout_start — clicked a plan / opened Stripe checkout (spec step 38, value+currency). */
export function ga4CheckoutStart(params: {
  value: number
  currency: string
  plan: string
}): void {
  event('checkout_start', {
    value: params.value,
    currency: params.currency,
    items: [{ item_id: params.plan, item_name: `Appex ${params.plan}` }],
  })
}

/**
 * purchase (browser) — fired on the post-payment success page. `transactionId`
 * MUST be the Stripe checkout session id (from the success URL), the SAME id the
 * server sends as GA4 `transaction_id`, so GA4 dedups the two hits into one
 * purchase instead of double-counting revenue.
 */
export function ga4Purchase(params: {
  transactionId: string
  value: number
  currency: string
  plan?: string
}): void {
  event('purchase', {
    transaction_id: params.transactionId,
    value: params.value,
    currency: params.currency,
    ...(params.plan ? { items: [{ item_id: params.plan, item_name: `Appex ${params.plan}` }] } : {}),
  })
}
