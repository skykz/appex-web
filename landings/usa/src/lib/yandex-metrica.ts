/**
 * Yandex Metrica browser layer for the USA funnel.
 *
 * The FIFTH tracking layer, running in parallel to the Meta Pixel, GA4, the GTM
 * container and our own quiz_events store. It deliberately mirrors `ga4.ts`
 * function-for-function: same event names, same envelope, same never-throws
 * discipline — so the two can be cross-checked against each other, and so
 * adding an event to one makes the omission in the other obvious.
 *
 * Why Metrica alongside GA4:
 *  - Webvisor (session replay) + scroll/click maps, which GA4 has no equivalent
 *    of. The paywall is where the money is lost, and "watch twenty people fail
 *    to reach the plan cards" answers questions no aggregate funnel can.
 *  - It is the attribution system Yandex.Direct reads. A Direct campaign whose
 *    conversions live only in GA4 cannot be optimised by Yandex's bidding.
 *
 * Counter id comes from VITE_YM_COUNTER_ID. Unlike the GA4 measurement id there
 * is NO baked-in default: an unset id means the counter does not exist yet, and
 * inventing one would send this funnel's data into a stranger's counter.
 *
 * Suppressed in DEV builds unless VITE_YM_DEBUG=true, matching the GA4 layer, so
 * local traffic never pollutes production reports.
 */

import { getEventEnvelope } from './attribution'
import { getFunnelDimensions } from './quiz-tracker'

type YmFn = (...args: unknown[]) => void

declare global {
  interface Window {
    ym?: YmFn & { a?: unknown[] }
  }
}

/**
 * Metrica counter id (public — it ships in client HTML). No default on purpose:
 * see the module docstring.
 */
const COUNTER_ID = (import.meta.env.VITE_YM_COUNTER_ID as string | undefined)?.trim() || ''

/** Opt-in flag to allow Metrica to fire in DEV builds. */
const DEBUG_ENABLED = (import.meta.env.VITE_YM_DEBUG as string | undefined)?.trim() === 'true'

/**
 * Whether Metrica events should fire: a counter id is set, and we're not in a
 * DEV build (unless the debug flag opts in). Mirrors the GA4 layer's gating.
 */
const TRACKING_ENABLED = Boolean(COUNTER_ID) && (!import.meta.env.DEV || DEBUG_ENABLED)

/** True when Metrica is configured and events are allowed to fire. */
export function isYmEnabled(): boolean {
  return TRACKING_ENABLED
}

/** The configured counter id (empty string when unset) — for diagnostics. */
export function getYmCounterId(): string {
  return COUNTER_ID
}

let initialized = false

/**
 * Injects the Metrica tag once and initialises the counter. Idempotent; no-op
 * when disabled.
 *
 * `trackLinks` and `accurateTrackBounce` match Yandex's recommended defaults.
 * `webvisor:true` is the point of adding Metrica at all — see the docstring.
 *
 * `defer:true` makes route changes the single source of page views, exactly as
 * `send_page_view:false` does for GA4. Without it Metrica would count its own
 * automatic hit AND our `ymPageView`, double-counting every landing view.
 */
export function initYm(): void {
  if (initialized || !TRACKING_ENABLED || typeof window === 'undefined') return
  initialized = true

  const w = window
  // Yandex's stub: queues calls made before the tag script finishes loading, so
  // an event fired during the first render is replayed rather than dropped.
  w.ym =
    w.ym ||
    (function ymStub(...args: unknown[]) {
      ;(w.ym!.a = w.ym!.a || []).push(args)
    } as YmFn & { a?: unknown[] })

  w.ym(COUNTER_ID, 'init', {
    defer: true,
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: true,
    // Metrica reads ecommerce data from this global. It is deliberately NOT
    // `dataLayer`: GTM owns that array, and letting Metrica share it would mean
    // every GTM push is re-read as an ecommerce payload and vice versa.
    ecommerce: 'ymDataLayer',
  })

  const script = document.createElement('script')
  script.async = true
  script.src = 'https://mc.yandex.ru/metrika/tag.js'
  const first = document.getElementsByTagName('script')[0]
  first?.parentNode?.insertBefore(script, first)
}

/**
 * Stamps the standard envelope (anon_id/session_id/timestamp + attribution) plus
 * the funnel dimensions onto every goal's params.
 *
 * Added HERE rather than at each call site for the same reason GA4 does it: a
 * new event physically cannot forget them, so Metrica can never disagree with
 * GA4 and our own store about which A/B arm a conversion belongs to.
 */
function withAttribution(params?: Record<string, unknown>): Record<string, unknown> {
  const dims = getFunnelDimensions()
  return {
    ...getEventEnvelope(),
    pricing_variant: dims.pricingVariant,
    product_slug: dims.productSlug,
    funnel_slug: dims.funnelSlug,
    flow_version: dims.flowVersion,
    ab_bucket: dims.abBucket,
    ...(params ?? {}),
  }
}

/**
 * Fires a Metrica goal. `target` is the goal identifier configured in the
 * Metrica UI — we use the SAME names as the GA4 events so the two reports line
 * up row for row. No-op when disabled or the tag isn't ready.
 */
function goal(target: string, params?: Record<string, unknown>): void {
  if (!TRACKING_ENABLED || typeof window === 'undefined' || !window.ym) return
  try {
    window.ym(COUNTER_ID, 'reachGoal', target, withAttribution(params))
  } catch {
    /* analytics must never break the funnel it measures */
  }
}

/**
 * Reads Metrica's `ClientID` so a server-side offline conversion can be attached
 * to the same visitor. The offline-conversions API keys on exactly this value.
 *
 * Resolves null when disabled / not ready / on timeout. Never rejects — mirrors
 * `getGa4ClientId`, and is called from the same place in the checkout flow.
 */
export function getYmClientId(timeoutMs = 800): Promise<string | null> {
  return new Promise((resolve) => {
    if (!TRACKING_ENABLED || typeof window === 'undefined' || !window.ym) {
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
      window.ym(COUNTER_ID, 'getClientID', (id: unknown) => {
        window.clearTimeout(timer)
        finish(typeof id === 'string' && id ? id : null)
      })
    } catch {
      window.clearTimeout(timer)
      finish(null)
    }
  })
}

// ─── Funnel event helpers (names mirror ga4.ts one-for-one) ────────────────

/**
 * page_view — every route change.
 *
 * Metrica's `hit` is its page-view primitive; it takes the URL plus the previous
 * one as `referer`, which is what keeps in-SPA navigation paths intact (without
 * it every internal step looks like a direct entry).
 */
export function ymPageView(path?: string): void {
  if (!TRACKING_ENABLED || typeof window === 'undefined' || !window.ym) return
  try {
    const url = typeof window !== 'undefined' ? window.location.href : path
    window.ym(COUNTER_ID, 'hit', url, {
      params: withAttribution(path ? { page_path: path } : undefined),
    })
  } catch {
    /* never throw from tracking */
  }
}

/** landing_view — opened the landing (funnel step 1). */
export function ymLandingView(params?: { item_name?: string }): void {
  goal('landing_view', params?.item_name ? { item_name: params.item_name } : undefined)
}

/** cta_click — a "start the quiz" button was clicked; `location` names the section. */
export function ymCtaClick(params: { location: string }): void {
  goal('cta_click', { location: params.location })
}

/** scroll_depth — reached 25/50/75/100% of the landing. */
export function ymScrollDepth(params: { percent: number }): void {
  goal('scroll_depth', { percent: params.percent })
}

/** quiz_start — first quiz answer. */
export function ymQuizStart(): void {
  goal('quiz_start')
}

/** quiz_step — every quiz screen view (drop-off funnel by step_index). */
export function ymQuizStep(params: {
  step_index: number
  step_id: string
  section: string
  type: string
}): void {
  goal('quiz_step', params)
}

/** quiz_abandon — left the quiz without finishing. */
export function ymQuizAbandon(params: {
  step_index: number
  step_id: string
  section: string
  type: string
  seconds_on_step: number
  seconds_in_quiz: number
  answered_count: number
}): void {
  goal('quiz_abandon', params)
}

/** quiz_complete — reached the last quiz screen. */
export function ymQuizComplete(): void {
  goal('quiz_complete')
}

/** lead — submitted email in the quiz. */
export function ymLead(): void {
  goal('lead')
}

/** name_submit — submitted name. */
export function ymNameSubmit(): void {
  goal('name_submit')
}

/** plan_view — reached the personal-plan reveal. */
export function ymPlanView(): void {
  goal('plan_view')
}

/** wheel_view — discount wheel shown. */
export function ymWheelView(): void {
  goal('wheel_view')
}

/** wheel_spin — user tapped to spin the discount wheel. */
export function ymWheelSpin(): void {
  goal('wheel_spin')
}

/** wheel_result — wheel landed and the discount popup was shown. */
export function ymWheelResult(params?: { discount_percent?: number }): void {
  goal('wheel_result', params)
}

/** paywall_view — paywall screen shown. */
export function ymPaywallView(params?: { discount_tier?: string }): void {
  goal('paywall_view', params)
}

/** plan_select — the visitor switched the highlighted plan on the paywall. */
export function ymPlanSelect(params: {
  plan: string
  discount_tier: string
  select_index: number
}): void {
  goal('plan_select', params)
}

/** checkout_modal_view — the order-summary modal opened. */
export function ymCheckoutModalView(params: {
  plan: string
  discount_tier: string
  value: number
}): void {
  goal('checkout_modal_view', params)
}

/** checkout_abandon — the order summary was dismissed without paying. */
export function ymCheckoutAbandon(params: {
  plan: string
  discount_tier: string
  value: number
  seconds_on_modal: number
  reason: string
}): void {
  goal('checkout_abandon', params)
}

/** paywall_abandon — left the paywall without opening checkout. */
export function ymPaywallAbandon(params: {
  discount_tier: string
  seconds_on_paywall: number
  max_scroll: number
  opened_checkout: boolean
}): void {
  goal('paywall_abandon', params)
}

/** checkout_error — creating the Stripe session failed. */
export function ymCheckoutError(params: {
  plan: string
  discount_tier: string
  message: string
}): void {
  goal('checkout_error', params)
}

/** paywall_exit_intent_shown — the 71% "last chance" offer was revealed. */
export function ymPaywallExitIntentShown(): void {
  goal('paywall_exit_intent_shown', { discount_tier: 'exit' })
}

/** paywall_timer_expired — the 10-min countdown hit 0, discount burned. */
export function ymPaywallTimerExpired(): void {
  goal('paywall_timer_expired', { discount_tier: 'expired' })
}

/** checkout_start — opened Stripe checkout, with the order value. */
export function ymCheckoutStart(params: {
  value: number
  currency: string
  plan: string
  discountTier?: string
}): void {
  goal('checkout_start', {
    value: params.value,
    currency: params.currency,
    ...(params.discountTier ? { discount_tier: params.discountTier } : {}),
    plan: params.plan,
  })
}

/**
 * purchase (browser) — fired on the post-payment success page.
 *
 * IMPORTANT — dedup differs from GA4. GA4 merges the browser and server
 * `purchase` by `transaction_id`; Metrica has no such merge between a browser
 * goal and an offline conversion. So the server deliberately uploads a
 * DIFFERENTLY-NAMED goal (`purchase_confirmed`, see ym-offline.service.ts):
 *
 *   purchase           — browser, realtime, lossy (adblock / closed tab)
 *   purchase_confirmed — server, authoritative, Stripe-verified
 *
 * Use `purchase_confirmed` for revenue reporting and Direct optimisation; use
 * `purchase` only to see realtime funnel movement. Summing them double-counts.
 */
export function ymPurchase(params: {
  transactionId: string
  value: number
  currency: string
  plan?: string
  discountTier?: string
}): void {
  goal('purchase', {
    transaction_id: params.transactionId,
    value: params.value,
    currency: params.currency,
    ...(params.discountTier ? { discount_tier: params.discountTier } : {}),
    ...(params.plan ? { plan: params.plan } : {}),
  })
  ymEcommercePurchase(params)
}

/**
 * Pushes the purchase into Metrica's ecommerce container, which is a separate
 * pipeline from goals: it is what populates the "Ecommerce" reports (revenue,
 * order value, product breakdown) rather than a simple conversion count.
 *
 * Writes to `ymDataLayer`, the array named in `init` — deliberately not GTM's
 * `dataLayer`; see initYm.
 */
function ymEcommercePurchase(params: {
  transactionId: string
  value: number
  currency: string
  plan?: string
}): void {
  if (!TRACKING_ENABLED || typeof window === 'undefined') return
  try {
    const w = window as unknown as { ymDataLayer?: unknown[] }
    w.ymDataLayer = w.ymDataLayer || []
    w.ymDataLayer.push({
      ecommerce: {
        currencyCode: params.currency,
        purchase: {
          actionField: { id: params.transactionId, revenue: params.value },
          products: [
            {
              id: params.plan ?? 'unknown',
              name: `Appex ${params.plan ?? 'plan'}`,
              price: params.value,
              quantity: 1,
            },
          ],
        },
      },
    })
  } catch {
    /* never throw from tracking */
  }
}
