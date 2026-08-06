import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'
import { paymentLog, quizLog } from '../../lib/logger.js'
import {
  createLandingCheckoutSession,
  type BillingInterval,
} from '../../services/stripe.service.js'
import {
  completeLandingCheckoutAccount,
  getLandingCheckoutStatus,
} from '../../services/landing-checkout-complete.service.js'
import {
  recordQuizEvents,
  attachEmailToQuizEvents,
} from '../../services/quiz-events.service.js'
import { getActiveQuiz } from '../../services/quiz-content.service.js'
import { resolveFunnel } from '../../services/quiz-funnel.service.js'
import { sendLeadGuidebookEmailAsync } from '../../services/lead-magnet-email.service.js'
import { confirmLeadEmail, sendLeadConfirmEmailAsync } from '../../services/lead-confirm.service.js'

const LANDING_IDS = ['usa'] as const
const PLAN_IDS = ['day_1', 'week_1', 'week_4', 'week_12', 'year'] as const

const submitQuizSchema = z.object({
  email: z.string().email().max(320),
  name: z.string().max(200).optional(),
  // Landing build the lead entered on. Without it zod strips the field the
  // client already sends, and lead rows silently lose the cohort they belong to.
  landing_version: z.string().max(40).optional(),
  landing: z.enum(LANDING_IDS).default('usa'),
  answers: z.record(z.unknown()).optional(),
  selected_plan: z.enum(PLAN_IDS).optional(),
  session_id: z.string().max(128).optional(),
  variant: z.string().max(64).optional(),
  utm_source: z.string().max(200).optional(),
  utm_campaign: z.string().max(200).optional(),
  utm_medium: z.string().max(200).optional(),
  utm_content: z.string().max(200).optional(),
  utm_term: z.string().max(200).optional(),
  fbclid: z.string().max(512).optional(),
  gclid: z.string().max(512).optional(),
  wbraid: z.string().max(512).optional(),
  gbraid: z.string().max(512).optional(),
})

/**
 * Normalizes email for deduplication and lookup across quiz submissions.
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Coerces stored quiz answers to a plain object before merge/update.
 */
function coerceAnswers(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

/**
 * Merges incoming quiz answers with any answers already stored for this lead.
 */
function mergeAnswers(
  existing: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown> | undefined
): Record<string, unknown> {
  const base = coerceAnswers(existing)
  if (!incoming) return base
  return { ...base, ...coerceAnswers(incoming) }
}

const ATTRIBUTION_FIELDS = [
  'variant',
  'landing_version',
  'utm_source',
  'utm_campaign',
  'utm_medium',
  'utm_content',
  'utm_term',
  'fbclid',
  'gclid',
  'wbraid',
  'gbraid',
] as const

/** Extracts the non-empty attribution fields from a request body. */
function pickAttribution(body: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const key of ATTRIBUTION_FIELDS) {
    const val = body[key]
    if (typeof val === 'string' && val) out[key] = val
  }
  return out
}

/**
 * Stores creative/UTM attribution under `answers.__attribution` with first-touch
 * semantics: existing values win, incoming only fills gaps. Avoids a schema
 * migration while still capturing which creative drove each lead.
 */
function mergeAttribution(
  answers: Record<string, unknown>,
  incoming: Record<string, string>
): Record<string, unknown> {
  const prevRaw =
    answers.__attribution && typeof answers.__attribution === 'object'
      ? (answers.__attribution as Record<string, unknown>)
      : {}
  // Only keep non-empty stored values, so a stray empty string can't shadow a
  // good incoming value under the first-touch (prev-wins) merge below.
  const prev: Record<string, string> = {}
  for (const [k, v] of Object.entries(prevRaw)) {
    if (typeof v === 'string' && v) prev[k] = v
  }
  const merged = { ...incoming, ...prev } // first-touch: prev overrides incoming
  if (Object.keys(merged).length === 0) return answers
  return { ...answers, __attribution: merged }
}

/** Reads the stored attribution blob from a lead's answers jsonb. */
function attributionFromAnswers(answers: unknown): Record<string, string> {
  if (answers && typeof answers === 'object' && !Array.isArray(answers)) {
    const blob = (answers as Record<string, unknown>).__attribution
    if (blob && typeof blob === 'object') return blob as Record<string, string>
  }
  return {}
}

/**
 * Upserts a marketing quiz submission keyed by email + landing.
 * Public endpoint — used by the USA landing funnel before account creation.
 */
export async function submitLandingQuiz(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = submitQuizSchema.parse(req.body)
    const email = normalizeEmail(body.email)
    const now = new Date().toISOString()

    const { data: existing, error: selectError } = await supabaseAdmin
      .from('landing_quiz_submissions')
      .select('id, answers, name, utm_source, utm_campaign, utm_medium, session_id')
      .eq('email', email)
      .eq('landing', body.landing)
      .maybeSingle()

    if (selectError) throw new AppError(500, selectError.message)

    // Fold creative/UTM attribution into answers.__attribution (jsonb — no schema
    // change needed). First-touch: keep any existing blob, fill missing fields.
    const incomingAttribution = pickAttribution(body)
    const answersWithAttribution = mergeAttribution(
      mergeAnswers(existing?.answers as Record<string, unknown> | undefined, body.answers),
      incomingAttribution
    )

    const row = {
      email,
      name: body.name?.trim() || existing?.name || null,
      landing: body.landing,
      answers: answersWithAttribution,
      selected_plan: body.selected_plan ?? undefined,
      session_id: body.session_id ?? existing?.session_id ?? null,
      utm_source: body.utm_source ?? existing?.utm_source ?? null,
      utm_campaign: body.utm_campaign ?? existing?.utm_campaign ?? null,
      utm_medium: body.utm_medium ?? existing?.utm_medium ?? null,
      updated_at: now,
    }

    if (existing) {
      const updatePayload: Record<string, unknown> = {
        email: row.email,
        name: row.name,
        landing: row.landing,
        answers: row.answers,
        session_id: row.session_id,
        utm_source: row.utm_source,
        utm_campaign: row.utm_campaign,
        utm_medium: row.utm_medium,
        updated_at: row.updated_at,
      }
      if (body.selected_plan !== undefined) {
        updatePayload.selected_plan = body.selected_plan
      }

      const { data, error } = await supabaseAdmin
        .from('landing_quiz_submissions')
        .update(updatePayload)
        .eq('id', existing.id)
        .select('id, email, landing, created_at, updated_at')
        .single()

      if (error) throw new AppError(500, error.message)

      // `answerCount` is the funnel-depth signal: the quiz saves on every step,
      // so the distribution across leads shows where people drop off.
      quizLog.info('quiz.submitted', {
        reqId: req.reqId,
        email,
        landing: body.landing,
        created: false,
        answerCount: Object.keys(answersWithAttribution ?? {}).length,
        selectedPlan: body.selected_plan ?? null,
      })

      // The quiz re-submits on every step, so these fire repeatedly for one lead;
      // both services dedupe internally and send at most once. Called on the update
      // path too because the row is created at the email step while the name only
      // arrives on a later submit — so the first send may have had no name.
      sendLeadConfirmEmailAsync({
        email,
        name: row.name,
        landing: body.landing,
        reqId: req.reqId,
      })
      // No-op until LEAD_GUIDEBOOK_URL is configured (no asset exists yet).
      sendLeadGuidebookEmailAsync({
        email,
        name: row.name,
        landing: body.landing,
        reqId: req.reqId,
      })

      res.json({ ...data, created: false })
      return
    }

    const { data, error } = await supabaseAdmin
      .from('landing_quiz_submissions')
      .insert({
        ...row,
        selected_plan: body.selected_plan ?? null,
        created_at: now,
      })
      .select('id, email, landing, created_at, updated_at')
      .single()

    if (error) throw new AppError(500, error.message)

    quizLog.info('quiz.submitted', {
      reqId: req.reqId,
      email,
      landing: body.landing,
      created: true,
      answerCount: Object.keys(answersWithAttribution ?? {}).length,
      selectedPlan: body.selected_plan ?? null,
    })

    // Fire-and-forget: the visitor is mid-quiz and must not wait on Mailgun.
    sendLeadConfirmEmailAsync({
      email,
      name: row.name,
      landing: body.landing,
      reqId: req.reqId,
    })
    // No-op until LEAD_GUIDEBOOK_URL is configured (no asset exists yet).
    sendLeadGuidebookEmailAsync({
      email,
      name: row.name,
      landing: body.landing,
      reqId: req.reqId,
    })

    res.status(201).json({ ...data, created: true })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/landing/confirm?token=...
 *
 * Public endpoint behind the "Confirm email" button in the lead confirmation mail.
 *
 * Returns a coarse status and never the address that was looked up: the token
 * arrives in a URL, which lands in browser history, referrer headers and proxy
 * logs, so echoing back whose address it belongs to would leak it to anyone who
 * sees the link. `invalid` covers "no such token" and "malformed" alike so the
 * endpoint cannot be used to probe which tokens exist.
 */
export async function confirmLandingLeadEmail(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = typeof req.query.token === 'string' ? req.query.token : ''
    const result = await confirmLeadEmail({ token, reqId: req.reqId })

    // 200 for every outcome: this is read by a landing page that renders its own
    // copy per status, and a 4xx would surface as a generic browser error instead.
    res.json({ status: result.status })
  } catch (err) {
    next(err)
  }
}

/**
 * Updates only the selected billing plan for an existing quiz lead (paywall step).
 */
export async function updateLandingQuizPlan(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = z
      .object({
        email: z.string().email().max(320),
        landing: z.enum(LANDING_IDS).default('usa'),
        selected_plan: z.enum(PLAN_IDS),
      })
      .parse(req.body)

    const email = normalizeEmail(body.email)
    const now = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from('landing_quiz_submissions')
      .update({
        selected_plan: body.selected_plan,
        updated_at: now,
      })
      .eq('email', email)
      .eq('landing', body.landing)
      .select('id, email, landing, selected_plan, updated_at')
      .maybeSingle()

    if (error) throw new AppError(500, error.message)
    if (!data) {
      throw new AppError(
        404,
        'Quiz submission not found. Complete the quiz with your email first.'
      )
    }

    res.json(data)
  } catch (err) {
    next(err)
  }
}

const landingCheckoutSchema = z.object({
  email: z.string().email().max(320),
  name: z.string().max(200).optional(),
  landing: z.enum(LANDING_IDS).default('usa'),
  interval: z.enum(PLAN_IDS),
  // Discount tier the paywall was showing. A hint only — the server maps it to
  // a coupon, so the client can never name a coupon or an amount.
  discount_tier: z.enum(['intro', 'exit', 'expired']).default('intro'),
  // Meta attribution for server-side Purchase deduplication (all optional).
  // Capped at 500 — Stripe rejects metadata VALUES longer than 500 chars, which
  // would 500 the whole checkout (fbc embeds a variable-length fbclid).
  meta_event_id: z.string().max(128).optional(),
  fbp: z.string().max(500).optional(),
  fbc: z.string().max(500).optional(),
  // GA4 client id for the server-side Measurement Protocol purchase (dedup/attribution).
  ga4_client_id: z.string().max(128).optional(),
  // Creative/UTM tags for Purchase attribution (fallback to the stored lead).
  variant: z.string().max(64).optional(),
  utm_source: z.string().max(200).optional(),
  utm_campaign: z.string().max(200).optional(),
  // Ad-set / ad ids — utm_ad identifies the creative that made the sale.
  utm_adset: z.string().max(200).optional(),
  utm_ad: z.string().max(200).optional(),
  // Google Ads click id — for server-side Google Ads conversion attribution.
  gclid: z.string().max(500).optional(),
  // Flex-quiz product/creative, stamped on the Stripe session so post-purchase
  // routing can send the buyer to the right surface. Optional: a single-product
  // checkout omits them and the buyer lands on the default surface.
  product_slug: z.string().max(60).optional(),
  funnel_slug: z.string().max(80).optional(),
  /** Paywall pricing A/B arm, so revenue can be split by arm in Stripe. */
  pricing_variant: z.string().max(40).optional(),
})

/**
 * Starts Stripe Checkout for a USA landing lead without requiring an account first.
 * User provisioning and magic-link email are handled by the Stripe webhook.
 */
export async function createLandingCheckout(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = landingCheckoutSchema.parse(req.body)
    const email = normalizeEmail(body.email)
    const interval = body.interval as BillingInterval

    // Resolve creative/UTM attribution: request body first, else the stored
    // first-touch blob on the quiz lead (deep-funnel checkout may lack the query).
    let variant = body.variant
    let utmSource = body.utm_source
    let utmCampaign = body.utm_campaign
    let utmAdset = body.utm_adset
    let utmAd = body.utm_ad
    let gclid = body.gclid
    if (!variant || !utmSource || !utmCampaign || !utmAdset || !utmAd || !gclid) {
      // maybeSingle() + ignored error keeps checkout on the happy path even if
      // this best-effort attribution lookup fails — never block a real payment.
      const { data: lead } = await supabaseAdmin
        .from('landing_quiz_submissions')
        .select('answers')
        .eq('email', email)
        .eq('landing', body.landing)
        .maybeSingle()
      const stored = attributionFromAnswers(lead?.answers)
      variant = variant || stored.variant
      utmSource = utmSource || stored.utm_source
      utmCampaign = utmCampaign || stored.utm_campaign
      utmAdset = utmAdset || stored.utm_adset
      utmAd = utmAd || stored.utm_ad
      gclid = gclid || stored.gclid
    }

    // The quiz→payment handoff. Logged under `payment` (not `quiz`) so the whole
    // checkout.* sequence stays in one file and reads in order.
    paymentLog.info('checkout.requested', {
      reqId: req.reqId,
      email,
      interval,
      discountTier: body.discount_tier,
      landing: body.landing,
      utmSource: utmSource ?? null,
      utmCampaign: utmCampaign ?? null,
    })

    const url = await createLandingCheckoutSession({
      email,
      name: body.name,
      interval,
      landing: body.landing,
      tier: body.discount_tier,
      reqId: req.reqId,
      meta: {
        eventId: body.meta_event_id,
        fbp: body.fbp,
        fbc: body.fbc,
      },
      ga4: { clientId: body.ga4_client_id },
      attribution: { variant, utmSource, utmCampaign, utmAdset, utmAd, gclid },
      productSlug: body.product_slug,
      funnelSlug: body.funnel_slug,
      pricingVariant: body.pricing_variant,
    })

    res.json({ url })
  } catch (err) {
    next(err)
  }
}

const checkoutSessionQuerySchema = z.object({
  session_id: z.string().min(1).max(128),
})

const completeCheckoutSchema = z.object({
  session_id: z.string().min(1).max(128),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(200).optional(),
})

/**
 * Polls whether a USA landing Stripe checkout is paid and the learner account is provisioned.
 */
export async function getLandingCheckoutSessionStatus(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { session_id } = checkoutSessionQuerySchema.parse(req.query)
    const status = await getLandingCheckoutStatus(session_id)
    res.json(status)
  } catch (err) {
    next(err)
  }
}

/**
 * Sets password on a provisioned post-checkout account and returns tokens for the learner SPA.
 */
export async function completeLandingCheckout(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = completeCheckoutSchema.parse(req.body)
    const result = await completeLandingCheckoutAccount({
      sessionId: body.session_id,
      password: body.password,
      name: body.name,
    })
    res.json(result)
  } catch (err) {
    next(err)
  }
}

/** One quiz screen view/answer. Kept permissive: analytics must never 400 a
 *  funnel step over a stray field, so unknown props ride along in `props`. */
const quizEventSchema = z.object({
  /** Idempotency key from the client; duplicates are dropped on insert. */
  event_id: z.string().uuid(),
  anon_id: z.string().min(1).max(128),
  session_id: z.string().max(128).optional(),
  email: z.string().max(320).optional(),
  event_name: z.enum([
    'quiz_start',
    'step_view',
    'step_answer',
    'quiz_complete',
    'quiz_abandon',
  ]),
  step_order: z.number().int().min(0).max(500).optional(),
  step_id: z.string().max(120).optional(),
  section: z.string().max(60).optional(),
  step_type: z.string().max(40).optional(),
  question_text: z.string().max(500).optional(),
  answer_label: z.string().max(500).optional(),
  answer_value: z.unknown().optional(),
  ms_on_step: z.number().int().min(0).max(86_400_000).optional(),
  ms_in_quiz: z.number().int().min(0).max(86_400_000).optional(),
  quiz_version: z.string().max(40).optional(),
  landing_version: z.string().max(40).optional(),
  attribution: z.record(z.unknown()).optional(),
  props: z.record(z.unknown()).optional(),
  landing: z.enum(LANDING_IDS).optional(),
  device: z.string().max(20).optional(),
  // Funnel routing dimensions (migration 042). Optional so pre-flex clients
  // validate unchanged; bounded like the other slugs to cap a hostile payload.
  product_slug: z.string().max(60).optional(),
  funnel_slug: z.string().max(80).optional(),
  flow_version: z.string().max(40).optional(),
  ab_bucket: z.string().max(60).optional(),
  checkpoint: z.string().max(40).optional(),
  /** Paywall pricing A/B arm — separate from ab_bucket, which names the quiz-flow arm. */
  pricing_variant: z.string().max(40).optional(),
})

// Batched: the client buffers steps and flushes periodically, so one request
// carries several screens. Capped so a malformed or hostile client can't push
// an unbounded insert.
const quizEventsSchema = z.object({
  events: z.array(quizEventSchema).min(1).max(50),
})

/**
 * Ingests per-step quiz analytics.
 *
 * Always answers 202 — including on validation failure. This endpoint is fired
 * from `sendBeacon` during page unload and from every quiz step; a 4xx would
 * make the client retry or log noise while changing nothing for the visitor,
 * and a blocked analytics call must never stall the funnel.
 */
export async function ingestQuizEvents(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  void next
  const res = _res
  try {
    const parsed = quizEventsSchema.safeParse(req.body)
    if (!parsed.success) {
      quizLog.warn('quiz_events.invalid_payload', {
        issues: parsed.error.issues.slice(0, 3),
      })
      res.status(202).json({ accepted: 0 })
      return
    }

    const written = await recordQuizEvents(parsed.data.events)

    // The email arrives ~30 screens in; backfill it onto the earlier anonymous
    // rows so a purchase can be traced back to the answers that preceded it.
    const withEmail = parsed.data.events.find((e) => e.email)
    if (withEmail?.email) {
      await attachEmailToQuizEvents(withEmail.anon_id, withEmail.email)
    }

    res.status(202).json({ accepted: written })
  } catch (err) {
    // Swallow: analytics must not surface errors into the funnel.
    quizLog.error('quiz_events.unhandled', {
      message: err instanceof Error ? err.message : 'unknown',
    })
    res.status(202).json({ accepted: 0 })
  }
}


/**
 * Serves the published quiz for a landing.
 *
 * Returns `{ quiz: null }` with 200 when nothing is published — the client then
 * renders its built-in flow. A 404 would be wrong: "no version published" is a
 * normal state, not a missing route, and treating it as an error would make the
 * client log noise on every load during rollout.
 */
export async function getQuizContent(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const landing = typeof req.query.landing === 'string' ? req.query.landing : 'usa'
    const quiz = await getActiveQuiz(landing)
    // Short public cache: content changes on an editor's schedule, and this
    // sits in front of the first paint of the funnel.
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
    res.json({ quiz })
  } catch (err) {
    next(err)
  }
}

const funnelQuerySchema = z.object({
  /** Creative slug from the ad URL's `?c=`. */
  c: z.string().min(1).max(80),
  /** Visitor's stable id (anon_id), so their A/B arm sticks across reloads. */
  anon_id: z.string().max(128).optional(),
})

/**
 * Resolves `?c=<creative>` into the product + flow + A/B arm for this visitor.
 *
 * Sits at the very top of paid traffic, so it is deliberately forgiving: a bad or
 * unknown slug returns `{ funnel: null }` (200, not an error) and the client runs
 * its built-in flow. The A/B arm is chosen server-side from the visitor's anon_id
 * so it is sticky and unforgeable.
 *
 * NOT cached at the CDN by (visitor), because the arm varies per anon_id; a short
 * private cache only, so a reload within the window doesn't re-query.
 */
export async function getQuizFunnel(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = funnelQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      // Malformed request → tell the client to use its default, don't 4xx the
      // first paint of the funnel.
      res.json({ funnel: null })
      return
    }
    const { c, anon_id } = parsed.data
    const funnel = await resolveFunnel(c, anon_id ?? '')
    // Private + short: the response is visitor-specific (their arm), so it must
    // not be shared by a CDN across visitors.
    res.set('Cache-Control', 'private, max-age=60')
    res.json(funnel ? { ...funnel } : { funnel: null })
  } catch (err) {
    next(err)
  }
}
