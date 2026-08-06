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
import { getFunnelDimensions } from './quiz-tracker'

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

/**
 * Stamps the standard envelope (anon_id/session_id/timestamp + attribution) plus
 * the funnel dimensions.
 *
 * The dimensions are added HERE rather than at each call site so every GA4 event
 * carries them automatically and can't be forgotten on a new one. Without them
 * GA4 would merge both A/B arms — and both quiz flows, once a second one ships —
 * into one set of numbers, while our own store reports them split. Two sources
 * disagreeing is worse than one being absent, because both look authoritative.
 *
 * Registered in GA4 as custom dimensions to be usable as report breakdowns.
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

/**
 * plan_select (custom) — the visitor switched the highlighted plan on the paywall.
 *
 * The paywall opens on "4 Weeks" by default, so a purchase of that plan cannot
 * tell you whether it was chosen or merely accepted. This does: it records the
 * plans people actively move to, and how often they change their mind before
 * committing — the signal for whether the default and the price ladder are right.
 */
export function ga4PlanSelect(params: {
  plan: string
  discount_tier: string
  /** Which pick this is in the session (1 = first change), for indecision. */
  select_index: number
}): void {
  event('plan_select', params)
}

/**
 * checkout_modal_view (custom) — the order-summary modal opened.
 *
 * The step between "clicked GET MY PLAN" and "redirected to Stripe". Without it,
 * a drop here is invisible: checkout_start fires only after the modal is
 * confirmed, so people who open the summary and think again look identical to
 * people who never clicked at all.
 */
export function ga4CheckoutModalView(params: {
  plan: string
  discount_tier: string
  value: number
}): void {
  event('checkout_modal_view', params)
}

/**
 * checkout_abandon (custom) — the order summary was dismissed without paying.
 *
 * This is the most expensive abandonment in the funnel: the visitor read the
 * price, the renewal terms and the FTC disclosure, and still backed out.
 * `seconds_on_modal` separates a misclick from a deliberate reconsideration.
 */
export function ga4CheckoutAbandon(params: {
  plan: string
  discount_tier: string
  value: number
  seconds_on_modal: number
  reason: string
}): void {
  event('checkout_abandon', params)
}

/**
 * checkout_error (custom) — creating the Stripe session failed.
 *
 * Distinguishes "changed their mind" from "we broke". Worth its own event
 * because it is silent otherwise: the visitor sees an alert and leaves, and the
 * funnel just shows a missing purchase. Exactly the 500 that took this project
 * days to notice in production.
 */
export function ga4CheckoutError(params: {
  plan: string
  discount_tier: string
  message: string
}): void {
  event('checkout_error', params)
}

/**
 * paywall_abandon (custom) — left the paywall without opening checkout.
 *
 * `max_scroll` tells apart "saw the price and bounced" from "never scrolled to
 * the plans at all", which need opposite fixes: pricing versus page structure.
 */
export function ga4PaywallAbandon(params: {
  discount_tier: string
  seconds_on_paywall: number
  max_scroll: number
  opened_checkout: boolean
}): void {
  event('paywall_abandon', params)
}

/**
 * cta_click (custom) — a "start the quiz" button was clicked on the landing.
 *
 * `location` names the section the button lives in (hero, navbar, features…).
 * The landing has ~11 of these CTAs; without the parameter you learn only that
 * *someone* clicked, not which pitch actually converts.
 *
 * This is also what separates the two very different reasons the landing→quiz
 * step can be leaking: few clicks means the copy isn't convincing, while many
 * clicks with few quiz_starts means the quiz itself fails to open.
 */
export function ga4CtaClick(params: { location: string }): void {
  event('cta_click', { location: params.location })
}

/**
 * scroll_depth (custom) — visitor reached 25/50/75/100% of the landing.
 *
 * Fires once per threshold per page view. Shows whether people read the page at
 * all: if most never pass 25%, the sections below the hero are irrelevant and
 * the problem is the first screen (or load speed).
 */
export function ga4ScrollDepth(params: { percent: number }): void {
  event('scroll_depth', { percent: params.percent })
}

/**
 * quiz_abandon (custom) — the visitor left the quiz without finishing.
 *
 * `quiz_step` alone can only show where people stopped *appearing*, which cannot
 * distinguish "left the funnel here" from "still sitting on this screen". This
 * fires on the actual exit (tab closed/backgrounded, or the overlay dismissed)
 * and names the last screen reached, so the abandon funnel is measured rather
 * than inferred.
 *
 * `seconds_on_step` separates two very different failures on the same screen:
 * an instant bounce (confusing or unwanted question) from a long pause
 * (question is hard to answer, or the copy is too long).
 *
 * Callers must fire this from `visibilitychange` (hidden), NOT `beforeunload`:
 * gtag sends over the network and unload routinely kills in-flight requests,
 * while `visibilitychange` still has time to flush and is the only one of the two
 * that fires reliably on mobile Safari.
 */
export function ga4QuizAbandon(params: {
  step_index: number
  step_id: string
  section: string
  type: string
  seconds_on_step: number
  seconds_in_quiz: number
  answered_count: number
}): void {
  event('quiz_abandon', params)
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

/** wheel_view — discount wheel shown, between the plan reveal and the paywall. */
export function ga4WheelView(): void {
  event('wheel_view')
}

/** wheel_spin — user tapped to spin the discount wheel. */
export function ga4WheelSpin(): void {
  event('wheel_spin')
}

/** wheel_result — wheel landed and the discount popup was shown. */
export function ga4WheelResult(params?: { discount_percent?: number }): void {
  event('wheel_result', params)
}

/** paywall_view — paywall screen shown (spec funnel step 38). */
export function ga4PaywallView(params?: { discount_tier?: string }): void {
  event('paywall_view', params)
}

/** paywall_exit_intent_shown — the 71% "last chance" offer was revealed. */
export function ga4PaywallExitIntentShown(): void {
  event('paywall_exit_intent_shown', { discount_tier: 'exit' })
}

/** paywall_timer_expired — the 10-min countdown hit 0, discount burned. */
export function ga4PaywallTimerExpired(): void {
  event('paywall_timer_expired', { discount_tier: 'expired' })
}

/** checkout_start — clicked a plan / opened Stripe checkout (spec step 38, value+currency). */
export function ga4CheckoutStart(params: {
  value: number
  currency: string
  plan: string
  /** Which discount state the paywall was in: intro | exit | expired. */
  discountTier?: string
}): void {
  event('checkout_start', {
    value: params.value,
    currency: params.currency,
    ...(params.discountTier ? { discount_tier: params.discountTier } : {}),
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
  /** Which discount state sold: intro | exit | expired. */
  discountTier?: string
}): void {
  event('purchase', {
    transaction_id: params.transactionId,
    value: params.value,
    currency: params.currency,
    ...(params.discountTier ? { discount_tier: params.discountTier } : {}),
    ...(params.plan ? { items: [{ item_id: params.plan, item_name: `Appex ${params.plan}` }] } : {}),
  })
}
