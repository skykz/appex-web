import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'
import {
  createLandingCheckoutSession,
  type BillingInterval,
} from '../../services/stripe.service.js'
import {
  completeLandingCheckoutAccount,
  getLandingCheckoutStatus,
} from '../../services/landing-checkout-complete.service.js'

const LANDING_IDS = ['usa'] as const
const PLAN_IDS = ['week_1', 'week_4', 'year'] as const

const submitQuizSchema = z.object({
  email: z.string().email().max(320),
  name: z.string().max(200).optional(),
  landing: z.enum(LANDING_IDS).default('usa'),
  answers: z.record(z.unknown()).optional(),
  selected_plan: z.enum(PLAN_IDS).optional(),
  session_id: z.string().max(128).optional(),
  utm_source: z.string().max(200).optional(),
  utm_campaign: z.string().max(200).optional(),
  utm_medium: z.string().max(200).optional(),
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

    const row = {
      email,
      name: body.name?.trim() || existing?.name || null,
      landing: body.landing,
      answers: mergeAnswers(existing?.answers as Record<string, unknown> | undefined, body.answers),
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

    res.status(201).json({ ...data, created: true })
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

    const url = await createLandingCheckoutSession({
      email,
      name: body.name,
      interval,
      landing: body.landing,
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
