/**
 * GA4 (Google Analytics 4, gtag.js) browser event layer for the USA funnel.
 *
 * Runs IN PARALLEL to the Meta Pixel (`meta-pixel.ts`) as a second, independent
 * measurement stream (Google Ads + GA4 funnel/retention reports). Same funnel
 * points, GA4-standard event names.
 *
 * The pixel id (Measurement ID) defaults to nothing — with no
 * `VITE_GA4_MEASUREMENT_ID` set, every function here is a safe no-op. Suppressed
 * in DEV builds unless a debug flag is set, so local/QA traffic doesn't pollute
 * production analytics. Nothing here ever throws.
 *
 * Funnel → GA4 event mapping (parallels the Meta table):
 *   Any screen        → page_view
 *   Landing / course  → view_item
 *   Quiz started      → quiz_start      (custom)
 *   Quiz completed    → quiz_complete   (custom)
 *   Left email        → generate_lead
 *   Opened pay        → begin_checkout  (value+currency)
 *   Paid              → purchase        (server-side, Measurement Protocol — NOT here)
 *
 * The server-side `purchase` (backend/src/services/ga4-mp.service.ts) reuses the
 * same GA4 `client_id` captured here so both hits attribute to one user/session.
 */

import { getAttributionParams } from './attribution'

type GtagFn = (...args: unknown[]) => void

declare global {
  interface Window {
    gtag?: GtagFn
    dataLayer?: unknown[]
  }
}

const MEASUREMENT_ID =
  (import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined)?.trim() || null
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
 * when disabled. We set `send_page_view:false` so route changes are the single
 * source of page_view (fired from RouteAnalytics), matching the Meta layer.
 */
export function initGa4(): void {
  if (initialized || !TRACKING_ENABLED || typeof window === 'undefined') return
  initialized = true

  const w = window
  w.dataLayer = w.dataLayer || []
  // MUST push the `arguments` object (array-like), NOT a real Array — gtag.js's
  // dataLayer processor only executes entries where
  // `toString.call(entry) === "[object Arguments]"`. A rest-param `...args` would
  // build a true Array, which gtag silently ignores (no config, no events, and
  // the `get client_id` callback never fires). Match Google's canonical snippet.
  function gtag() {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments)
  }
  w.gtag = gtag as unknown as GtagFn

  gtag('js', new Date())
  gtag('config', MEASUREMENT_ID as string, {
    send_page_view: false,
    ...(DEBUG_ENABLED ? { debug_mode: true } : {}),
  })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
    MEASUREMENT_ID as string
  )}`
  const first = document.getElementsByTagName('script')[0]
  first?.parentNode?.insertBefore(script, first)
}

/** Merges captured creative/UTM attribution into every event's params. */
function withAttribution(params?: Record<string, unknown>): Record<string, unknown> {
  return { ...getAttributionParams(), ...(params ?? {}) }
}

/** Fires a GA4 event via gtag; no-op when disabled or gtag isn't ready. */
function event(name: string, params?: Record<string, unknown>): void {
  if (!TRACKING_ENABLED || typeof window === 'undefined' || !window.gtag) return
  window.gtag('event', name, withAttribution(params))
}

/**
 * Reads the GA4 `client_id` for the configured stream so the server-side
 * `purchase` (Measurement Protocol) attributes to the same user. Async because
 * gtag resolves it via a callback. Resolves null when GA4 is disabled/not ready
 * or the lookup times out (never rejects).
 */
export function getGa4ClientId(timeoutMs = 800): Promise<string | null> {
  return new Promise((resolve) => {
    if (!TRACKING_ENABLED || typeof window === 'undefined' || !window.gtag || !MEASUREMENT_ID) {
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
 * path) so GA4 reads the utm_* query params for native Session source/medium/
 * campaign attribution — GA4 derives traffic source from page_location/referrer,
 * not from custom event params.
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

/** view_item — opened a landing / course page. */
export function ga4ViewItem(params?: { item_name?: string }): void {
  event('view_item', params?.item_name ? { items: [{ item_name: params.item_name }] } : undefined)
}

/** quiz_start (custom) — first quiz answer. */
export function ga4QuizStart(): void {
  event('quiz_start')
}

/** quiz_complete (custom) — reached the last quiz screen. */
export function ga4QuizComplete(): void {
  event('quiz_complete')
}

/** generate_lead — submitted email in the quiz. */
export function ga4GenerateLead(): void {
  event('generate_lead')
}

/** begin_checkout — opened Stripe checkout from the paywall (value+currency). */
export function ga4BeginCheckout(params: {
  value: number
  currency: string
  plan: string
}): void {
  event('begin_checkout', {
    value: params.value,
    currency: params.currency,
    items: [{ item_id: params.plan, item_name: `Appex ${params.plan}` }],
  })
}

/**
 * purchase (browser) — fired on the post-payment success page. `transactionId`
 * MUST be the Stripe checkout session id (from the success URL), which is the
 * SAME id the server sends as GA4 `transaction_id`, so GA4 dedups the two hits
 * into one purchase instead of double-counting revenue.
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
