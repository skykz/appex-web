import { getEventEnvelope, getAttributionParams, getAttribution, LANDING_VERSION } from './attribution'
import { getApiBaseUrl } from './landing-api'

/**
 * Per-step quiz tracking to our own backend.
 *
 * GA4 answers "how many", this answers "who said what, and where exactly did
 * they stop". It writes every screen keyed by `anon_id` — which exists from the
 * first landing hit — so the ~90% who never reach the email step are recorded
 * too. Today those visitors leave no trace at all, which is why the drop-off
 * question can't be answered.
 *
 * Design notes:
 *  - BUFFERED: one request per screen would be ~33 round trips per visitor.
 *    Steps queue and flush together.
 *  - FLUSHED ON EXIT via sendBeacon, because the most valuable event (the last
 *    screen before leaving) happens exactly when a normal fetch gets killed.
 *  - NEVER THROWS: analytics must not be able to break the funnel it measures.
 */

/** Bump when the quiz flow changes, so cohorts stay comparable. */
export const QUIZ_VERSION = 'v1.0.0'

/**
 * Builds the query string carried on the `/quiz` URL so the quiz run is
 * shareable and legible in analytics/support the way jobescape's `/chat-v3`
 * link is. Everything here is ALREADY tracked elsewhere — this only surfaces it
 * in the address bar; it is not a new source of truth.
 *
 * Deliberately excludes email and any other PII: the address bar leaks into
 * browser history, server logs, and the Referer header, so personal data must
 * never ride in it.
 */
export function buildQuizQuery(stepNo: number, utmButton?: string): string {
  const params = new URLSearchParams()
  // First-touch attribution + identity, straight from the analytics envelope.
  for (const [key, value] of Object.entries(getAttributionParams())) {
    if (value) params.set(key, value)
  }
  params.set('landing_version', getAttribution().landing_version ?? LANDING_VERSION)
  params.set('quiz_version', QUIZ_VERSION)
  // Step position, so a link deep-links to where the user was — our analogue of
  // jobescape's quiz_page_id. Our "pages" are React steps, not DB rows, so this
  // is simply the 1-based step index.
  params.set('quiz_page_id', String(stepNo))
  // Which CTA opened the quiz, if known (hero / navbar / features / …).
  if (utmButton) params.set('utm_button', utmButton)
  return params.toString()
}

const FLUSH_AFTER = 4
const FLUSH_INTERVAL_MS = 5000
const MAX_BUFFER = 50

export type QuizEventName =
  | 'quiz_start'
  | 'step_view'
  | 'step_answer'
  | 'quiz_complete'
  | 'quiz_abandon'

export interface QuizEvent {
  event_name: QuizEventName
  step_order?: number
  step_id?: string
  section?: string
  step_type?: string
  question_text?: string
  answer_label?: string
  answer_value?: unknown
  ms_on_step?: number
  ms_in_quiz?: number
  /**
   * Named funnel stage this event reaches, when it reaches one. The only sound
   * cross-creative comparison signal — see migration 042. Left undefined on the
   * many events that don't land on a checkpoint.
   */
  checkpoint?: string
  props?: Record<string, unknown>
}

/**
 * step_id → the wording shown on that screen.
 *
 * Populated from the published quiz content so each recorded answer carries the
 * exact question the visitor read. Until content is published this stays empty
 * and events fall back to the answer key, which is still enough to build the
 * funnel — the text is what keeps old rows readable after copy changes.
 */
const questionText = new Map<string, string>()

/** Registers question wording; called once the quiz content is loaded. */
export function registerQuestionText(
  steps: { step_id: string; question_text?: string | null }[]
): void {
  for (const s of steps) {
    if (s.question_text) questionText.set(s.step_id, s.question_text)
  }
}

/** Wording for a step, or undefined when nothing is registered for it. */
export function getQuestionText(stepId: string): string | undefined {
  return questionText.get(stepId)
}

let buffer: Record<string, unknown>[] = []
let timer: number | null = null
let quizStartedAt = 0
let stepEnteredAt = 0
/** Set once the visitor gives it, then attached to later events. */
let knownEmail: string | undefined

/**
 * The active funnel's dimensions, stamped on every event so reports can slice by
 * creative, product, flow version and A/B arm without a join.
 *
 * These map 1:1 to the columns migration 042 added to quiz_events. Set once (and
 * refined once) per run by useFunnel; default to the built-in flow so events fire
 * correctly even if the resolver never ran — the tracker must never depend on the
 * funnel layer being wired, or analytics could silently go blank.
 */
type FunnelDims = {
  productSlug: string
  funnelSlug: string
  flowVersion: string
  abBucket: string
  /**
   * Paywall pricing A/B arm ("control" | "day_entry"), or null before one is
   * assigned.
   *
   * Its OWN dimension rather than reusing `abBucket`: that one names the quiz
   * FLOW arm, and a visitor is in both experiments at once. Folding two arms into
   * one column would make each test's results depend on the other's split, so
   * neither could be read.
   *
   * NULL UNTIL THE PAYWALL ASSIGNS IT — never defaulted to 'control'.
   * The arm is drawn on the paywall (Paywall.tsx), but quiz events fire long
   * before that. Defaulting to 'control' stamped every pre-paywall event with an
   * arm the visitor had not been given, so a visitor later drawn into `day_entry`
   * appeared in BOTH arms: `control` collected phantom sessions it never showed a
   * price to, inflating the denominator of revenue-per-visitor and making control
   * look worse than it is. Observed in production as a 7/2 split on paywall_view
   * where the true assignment is 50/50.
   *
   * The column is nullable by design (migration 045) precisely so "not yet
   * assigned" stays distinguishable from "assigned to control".
   */
  pricingVariant: string | null
}

const DEFAULT_FUNNEL_DIMS: FunnelDims = {
  productSlug: 'claude_automation',
  funnelSlug: 'default',
  flowVersion: QUIZ_VERSION,
  abBucket: 'control',
  pricingVariant: null,
}

const FUNNEL_DIMS_KEY = 'appexFunnelDims'

/**
 * Recovers funnel dimensions persisted by an earlier screen.
 *
 * The paywall/checkout lives on a different route than the quiz, and a full
 * reload wipes this module's in-memory state. Persisting them lets the checkout
 * still stamp the correct product/creative onto the Stripe session after such a
 * reload, instead of falling back to the default product and mis-routing the
 * buyer post-purchase.
 *
 * localStorage FIRST, sessionStorage only as a fallback — the same pattern
 * `appexCheckout` uses, for the same reason. The `purchase` event fires on
 * /checkout/success after a round-trip through Stripe, and mobile and in-app
 * browsers routinely return in a NEW TAB, where sessionStorage is empty. On
 * sessionStorage alone those purchases fell back to the defaults, silently
 * crediting every `day_entry` sale to `control` — a one-directional bias, which
 * is the worst kind: the experiment would look conclusive and be wrong.
 */
function loadFunnelDims(): FunnelDims {
  try {
    const raw =
      localStorage.getItem(FUNNEL_DIMS_KEY) ?? sessionStorage.getItem(FUNNEL_DIMS_KEY)
    if (!raw) return DEFAULT_FUNNEL_DIMS
    const parsed = JSON.parse(raw) as Partial<FunnelDims>
    return {
      productSlug: parsed.productSlug || DEFAULT_FUNNEL_DIMS.productSlug,
      funnelSlug: parsed.funnelSlug || DEFAULT_FUNNEL_DIMS.funnelSlug,
      flowVersion: parsed.flowVersion || DEFAULT_FUNNEL_DIMS.flowVersion,
      abBucket: parsed.abBucket || DEFAULT_FUNNEL_DIMS.abBucket,
      pricingVariant: parsed.pricingVariant || DEFAULT_FUNNEL_DIMS.pricingVariant,
    }
  } catch {
    return DEFAULT_FUNNEL_DIMS
  }
}

let funnelDims: FunnelDims = loadFunnelDims()

function persistFunnelDims(): void {
  const raw = JSON.stringify(funnelDims)
  try {
    // Written to BOTH: localStorage is what survives the Stripe round-trip
    // returning in a new tab, sessionStorage keeps the older readers working.
    localStorage.setItem(FUNNEL_DIMS_KEY, raw)
  } catch {
    /* storage disabled — the sessionStorage write below may still land */
  }
  try {
    sessionStorage.setItem(FUNNEL_DIMS_KEY, raw)
  } catch {
    /* storage disabled — in-memory value still holds for this page life */
  }
}

/**
 * Updates the funnel dimensions attached to subsequent events, and persists them
 * so a later route (paywall/checkout) recovers them across a reload.
 *
 * MERGES rather than replaces. Different surfaces own different dimensions — the
 * quiz sets product/funnel/flow, the paywall sets the pricing arm — and they run
 * on separate routes. A wholesale replace meant whichever ran last wiped the
 * other's fields, so a purchase would report a default pricing arm no matter
 * which shelf the buyer actually saw.
 */
export function setFunnelDimensions(dims: Partial<FunnelDims>): void {
  funnelDims = { ...funnelDims, ...dims }
  persistFunnelDims()
}

/**
 * The active funnel's product/creative, for the checkout call to stamp onto the
 * Stripe session. Read from the same module-level state the events use, so the
 * purchase is attributed to exactly the funnel the visitor ran — no separate
 * plumbing through the paywall.
 */
export function getFunnelDimensions(): FunnelDims {
  return funnelDims
}

/** UUID for the idempotency key; falls back where crypto.randomUUID is absent. */
function newEventId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  // RFC-4122-shaped fallback so the server's uuid validation still accepts it.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

function device(): string {
  if (typeof window === 'undefined') return 'unknown'
  const w = window.innerWidth
  return w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop'
}

/**
 * Environment facts recorded with every event, in `props`.
 *
 * `device` alone hides the cases that actually break: a 320px-wide phone and a
 * 430px one are both "mobile", but a question whose options overflow only fails
 * on the narrow one. Exact viewport is what makes that visible.
 *
 * `timezone` gives rough geography without touching an IP address, so a
 * region-specific drop-off (or a translation problem) can be spotted.
 *
 * Kept in `props` rather than new columns: these are for slicing, never for
 * joining, and columns would mean a migration each time we add one.
 */
function environment(): Record<string, unknown> {
  if (typeof window === 'undefined') return {}
  return {
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    screen_width: window.screen?.width,
    screen_height: window.screen?.height,
    // Minutes east of UTC — a plain number, easier to group than an IANA name.
    timezone_offset: -new Date().getTimezoneOffset(),
    // Language reveals the mismatch where an English funnel is shown to someone
    // whose browser is set to another language.
    language: navigator.language,
  }
}

function endpoint(): string | null {
  const base = getApiBaseUrl()
  return base ? `${base}/landing/quiz/events` : null
}

/**
 * Sends the buffer. `useBeacon` is for page-unload, where a normal fetch is
 * routinely cancelled — sendBeacon is handed to the browser to deliver after
 * the page is gone.
 */
function flush(useBeacon = false): void {
  if (!buffer.length) return
  const url = endpoint()
  if (!url) {
    buffer = []
    return
  }

  // Take a copy and clear, so events queued *during* the request aren't lost.
  const sending = buffer
  buffer = []
  const payload = JSON.stringify({ events: sending })
  if (timer !== null) {
    window.clearTimeout(timer)
    timer = null
  }

  /**
   * Puts a failed batch back at the front of the queue so the next flush retries
   * it. Every event carries an `event_id`, so a retry that partially succeeded
   * server-side is de-duplicated rather than double-counted — which is what
   * makes re-queueing safe rather than a source of inflated numbers.
   */
  const requeue = () => {
    buffer = [...sending, ...buffer].slice(-MAX_BUFFER)
  }

  try {
    if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      // Returns false when the payload exceeds the browser's beacon quota; fall
      // through to fetch rather than dropping the events silently.
      const queued = navigator.sendBeacon(
        url,
        new Blob([payload], { type: 'application/json' })
      )
      if (queued) return
    }
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      // Lets the request outlive the page when flush() races a navigation.
      keepalive: true,
    })
      .then((r) => {
        // 5xx means the server never stored them — keep for the next attempt.
        // 4xx is a payload the server will never accept, so retrying is futile.
        if (r.status >= 500) requeue()
      })
      .catch(() => {
        // Offline or a dropped connection: keep them for the next flush.
        requeue()
      })
  } catch {
    requeue()
  }
}

/** Queues an event, flushing when the buffer fills or the timer expires. */
export function trackQuizEvent(event: QuizEvent): void {
  if (typeof window === 'undefined') return

  try {
    const env = getEventEnvelope()
    const now = Date.now()
    if (!quizStartedAt) quizStartedAt = now

    buffer.push({
      // Stamped when the event is CREATED, not when it is sent: a retry of the
      // same buffered event must carry the same key so the server can discard
      // it, while a genuine re-answer gets a fresh one and is kept.
      event_id: newEventId(),
      anon_id: env.anon_id,
      session_id: env.session_id,
      ...(knownEmail ? { email: knownEmail } : {}),
      ...event,
      ms_in_quiz: event.ms_in_quiz ?? now - quizStartedAt,
      quiz_version: QUIZ_VERSION,
      // Funnel dimensions (migration 042 columns). Spread from the module-level
      // state so every event carries them without each call site having to.
      product_slug: funnelDims.productSlug,
      funnel_slug: funnelDims.funnelSlug,
      flow_version: funnelDims.flowVersion,
      ab_bucket: funnelDims.abBucket,
      // Omitted entirely until the paywall assigns an arm. The server schema is
      // `z.string().optional()`, which accepts a missing key but REJECTS null —
      // and a rejection there fails the whole event, so sending null would trade
      // one wrong column for the loss of the entire row.
      ...(funnelDims.pricingVariant
        ? { pricing_variant: funnelDims.pricingVariant }
        : {}),
      // Its own column, not just an attribution key: the landing and the quiz
      // ship independently, so reports need to slice by either one alone.
      landing_version: getAttribution().landing_version ?? LANDING_VERSION,
      attribution: getAttributionParams(),
      device: device(),
      landing: 'usa',
      // Environment first so an event's own props always win on a key clash.
      props: { ...environment(), ...(event.props ?? {}) },
    })

    // Hard cap: if flushing keeps failing, drop the oldest rather than grow
    // without bound and eventually break JSON.stringify on a long session.
    if (buffer.length > MAX_BUFFER) buffer = buffer.slice(-MAX_BUFFER)

    if (buffer.length >= FLUSH_AFTER) {
      flush()
      return
    }
    if (timer === null) {
      timer = window.setTimeout(() => flush(), FLUSH_INTERVAL_MS)
    }
  } catch {
    /* never throw from tracking */
  }
}

/**
 * Records a screen becoming visible and starts its dwell timer.
 * Returns the milliseconds spent on the previous screen.
 */
export function trackStepView(meta: {
  step_order: number
  step_id: string
  section?: string
  step_type?: string
  question_text?: string
  checkpoint?: string
}): void {
  const now = Date.now()
  stepEnteredAt = now
  if (!quizStartedAt) quizStartedAt = now
  trackQuizEvent({ event_name: 'step_view', ...meta })
}

/** Records an answer, with how long the visitor spent deciding. */
export function trackStepAnswer(meta: {
  step_order: number
  step_id: string
  section?: string
  step_type?: string
  question_text?: string
  answer_label?: string
  answer_value?: unknown
  checkpoint?: string
}): void {
  trackQuizEvent({
    event_name: 'step_answer',
    ...meta,
    ms_on_step: stepEnteredAt ? Date.now() - stepEnteredAt : undefined,
  })
}

/**
 * Attaches the email to this and all subsequent events. The backend backfills
 * it onto the earlier anonymous rows, which is what links a later purchase to
 * the answers that preceded it.
 */
export function setQuizEmail(email: string): void {
  knownEmail = email.trim().toLowerCase()
  flush()
}

/**
 * Records a post-quiz funnel step (paywall, plan choice, checkout).
 *
 * Same store as the quiz steps on purpose: a funnel split across two tables
 * can't be read as one sequence, and the paywall is exactly where the money is
 * lost — 21 leads produced 2 purchases. `step_id` carries the event name so the
 * funnel view orders quiz and paywall stages together.
 *
 * `step_order` continues past the quiz (100+) so ordering stays monotonic
 * without colliding with quiz steps if the quiz ever grows.
 */
const FUNNEL_ORDER: Record<string, number> = {
  // The discount wheel sits between the plan reveal (last quiz step) and the
  // paywall, so it takes 90-92: past the quiz's 0-33 but ahead of paywall_view.
  wheel_view: 90,
  wheel_spin: 91,
  wheel_result: 92,
  paywall_view: 100,
  plan_select: 101,
  checkout_modal_view: 102,
  checkout_abandon: 103,
  paywall_abandon: 104,
  checkout_error: 105,
  purchase: 110,
}

export function trackFunnelEvent(
  name: string,
  props: Record<string, unknown> = {}
): void {
  trackQuizEvent({
    event_name: 'step_view',
    step_id: name,
    step_order: FUNNEL_ORDER[name] ?? 100,
    section: 'paywall',
    step_type: 'funnel',
    // Values worth filtering on get their own columns; the rest ride in props.
    answer_label: typeof props.plan === 'string' ? props.plan : undefined,
    answer_value: props.value ?? props.plan ?? null,
    props,
  })
  // The paywall/success page is the last thing many visitors see, so don't wait
  // for the buffer to fill — a tab closed right after is otherwise a lost event.
  if (name.endsWith('_abandon') || name === 'checkout_error' || name === 'purchase') flush(true)
}

/** Records leaving mid-quiz. Called from the exit handler below. */
export function trackQuizAbandon(meta: {
  step_order: number
  step_id: string
  section?: string
  step_type?: string
  answered_count?: number
}): void {
  trackQuizEvent({
    event_name: 'quiz_abandon',
    ...meta,
    ms_on_step: stepEnteredAt ? Date.now() - stepEnteredAt : undefined,
    props: { answered_count: meta.answered_count },
  })
  flush(true)
}

/**
 * Flushes whatever is buffered when the page is hidden.
 *
 * `visibilitychange`, not `beforeunload`: it is the only one that fires
 * reliably on mobile Safari, where most of this traffic lands.
 */
export function installQuizFlushOnExit(): () => void {
  if (typeof document === 'undefined') return () => {}
  const onHidden = () => {
    if (document.visibilityState === 'hidden') flush(true)
  }
  document.addEventListener('visibilitychange', onHidden)
  return () => document.removeEventListener('visibilitychange', onHidden)
}
