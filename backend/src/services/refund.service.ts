import { supabaseAdmin } from '../db/supabase.js'
import { AppError } from '../utils/error-handler.js'
import { getStripe } from '../lib/stripe.js'
import { env } from '../config/env.js'
import {
  countLessonsCompletedSince,
  countLessonsOpenedSince,
} from './lesson-open.service.js'

const STANDARD_REFUND_DAYS = 7
const EU_REFUND_DAYS = 14
const MS_PER_DAY = 24 * 60 * 60 * 1000

export type RefundDecision = 'approved' | 'denied'

export type RefundReasonCode =
  | 'standard_7_day_no_engagement'
  | 'eu_14_day_no_completion'
  | 'courtesy_renewal_no_completion'
  | 'period_expired'
  | 'outside_refund_window'
  | 'lessons_completed'
  | 'lessons_opened'
  | 'courtesy_already_used'
  | 'not_renewal_charge'
  | 'billing_record_not_found'

export type RefundEvaluation = {
  decision: RefundDecision
  reasonCode: RefundReasonCode
  reasonDetail: string
  daysSincePurchase: number
  lessonsOpened: number
  lessonsCompleted: number
  isRenewalCharge: boolean
  subscriptionPeriodExpired: boolean
  courtesyRefundUsed: boolean
  isEuResident: boolean
  billingHistoryId: string | null
  purchasePaidAt: string | null
  amount: number | null
}

type BillingRow = {
  id: string
  user_id: string
  amount: number
  paid_at: string
  stripe_invoice_id: string | null
  stripe_payment_intent_id: string | null
  description: string
}

/**
 * Returns whole days elapsed since a payment timestamp (UTC calendar days floored).
 */
export function daysSincePaidAt(paidAtIso: string, now = Date.now()): number {
  const paidMs = new Date(paidAtIso).getTime()
  return Math.floor((now - paidMs) / MS_PER_DAY)
}

/**
 * True when the subscription billing period has ended.
 */
export async function isSubscriptionPeriodExpired(userId: string): Promise<boolean> {
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', userId)
    .maybeSingle()

  if (!sub?.current_period_end) return false

  const periodEndMs = new Date(sub.current_period_end as string).getTime()
  if (periodEndMs >= Date.now()) return false

  return true
}

/**
 * Loads the billing row used for refund evaluation (explicit id or most recent payment).
 */
async function resolveBillingRow(
  userId: string,
  billingHistoryId?: string | null
): Promise<BillingRow | null> {
  if (billingHistoryId) {
    const { data, error } = await supabaseAdmin
      .from('billing_history')
      .select('id, user_id, amount, paid_at, stripe_invoice_id, stripe_payment_intent_id, description')
      .eq('id', billingHistoryId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw new AppError(500, error.message)
    return data as BillingRow | null
  }

  const { data, error } = await supabaseAdmin
    .from('billing_history')
    .select('id, user_id, amount, paid_at, stripe_invoice_id, stripe_payment_intent_id, description')
    .eq('user_id', userId)
    .order('paid_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new AppError(500, error.message)
  return data as BillingRow | null
}

/**
 * True when this charge is a renewal (not the user's first paid invoice).
 */
async function isRenewalCharge(userId: string, billingRow: BillingRow): Promise<boolean> {
  const { count, error } = await supabaseAdmin
    .from('billing_history')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .lt('paid_at', billingRow.paid_at)

  if (error) throw new AppError(500, error.message)
  return (count ?? 0) > 0
}

/**
 * Evaluates refund eligibility for a user and optional billing history row.
 */
export async function evaluateRefundEligibility(args: {
  userId: string
  billingHistoryId?: string | null
}): Promise<RefundEvaluation> {
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('courtesy_refund_used, is_eu_resident')
    .eq('id', args.userId)
    .maybeSingle()

  if (userError) throw new AppError(500, userError.message)
  if (!user) throw new AppError(404, 'User not found')

  const billing = await resolveBillingRow(args.userId, args.billingHistoryId)
  if (!billing) {
    return {
      decision: 'denied',
      reasonCode: 'billing_record_not_found',
      reasonDetail: 'No payment record found for this user.',
      daysSincePurchase: 0,
      lessonsOpened: 0,
      lessonsCompleted: 0,
      isRenewalCharge: false,
      subscriptionPeriodExpired: await isSubscriptionPeriodExpired(args.userId),
      courtesyRefundUsed: Boolean(user.courtesy_refund_used),
      isEuResident: Boolean(user.is_eu_resident),
      billingHistoryId: null,
      purchasePaidAt: null,
      amount: null,
    }
  }

  const subscriptionPeriodExpired = await isSubscriptionPeriodExpired(args.userId)
  const daysSincePurchase = daysSincePaidAt(billing.paid_at)
  const lessonsOpened = await countLessonsOpenedSince(args.userId, billing.paid_at)
  const lessonsCompleted = await countLessonsCompletedSince(args.userId, billing.paid_at)
  const renewal = await isRenewalCharge(args.userId, billing)

  const base = {
    daysSincePurchase,
    lessonsOpened,
    lessonsCompleted,
    isRenewalCharge: renewal,
    subscriptionPeriodExpired,
    courtesyRefundUsed: Boolean(user.courtesy_refund_used),
    isEuResident: Boolean(user.is_eu_resident),
    billingHistoryId: billing.id,
    purchasePaidAt: billing.paid_at,
    amount: Number(billing.amount),
  }

  if (subscriptionPeriodExpired) {
    return {
      ...base,
      decision: 'denied',
      reasonCode: 'period_expired',
      reasonDetail: 'The subscription period has expired.',
    }
  }

  if (lessonsCompleted > 0) {
    return {
      ...base,
      decision: 'denied',
      reasonCode: 'lessons_completed',
      reasonDetail: 'At least one lesson was completed after this payment.',
    }
  }

  if (lessonsOpened > 0) {
    return {
      ...base,
      decision: 'denied',
      reasonCode: 'lessons_opened',
      reasonDetail: 'At least one lesson was opened after this payment.',
    }
  }

  if (daysSincePurchase <= STANDARD_REFUND_DAYS) {
    return {
      ...base,
      decision: 'approved',
      reasonCode: 'standard_7_day_no_engagement',
      reasonDetail: 'Within 7 days of purchase with no lesson engagement.',
    }
  }

  if (
    user.is_eu_resident &&
    daysSincePurchase <= EU_REFUND_DAYS
  ) {
    return {
      ...base,
      decision: 'approved',
      reasonCode: 'eu_14_day_no_completion',
      reasonDetail: 'EU consumer withdrawal: within 14 days with no completed lessons.',
    }
  }

  if (renewal && !user.courtesy_refund_used) {
    return {
      ...base,
      decision: 'approved',
      reasonCode: 'courtesy_renewal_no_completion',
      reasonDetail: 'Courtesy refund for renewal charge with no lesson engagement.',
    }
  }

  if (daysSincePurchase > STANDARD_REFUND_DAYS) {
    return {
      ...base,
      decision: 'denied',
      reasonCode: renewal && user.courtesy_refund_used
        ? 'courtesy_already_used'
        : 'outside_refund_window',
      reasonDetail: renewal && user.courtesy_refund_used
        ? 'Courtesy renewal refund was already used.'
        : `Refund window exceeded (${STANDARD_REFUND_DAYS} days for standard policy).`,
    }
  }

  return {
    ...base,
    decision: 'denied',
    reasonCode: 'outside_refund_window',
    reasonDetail: 'Charge is not eligible under the refund policy.',
  }
}

/**
 * Persists a refund evaluation decision for audit. Returns the row id so the
 * caller can update it (e.g. attach a Stripe refund id after the fact).
 */
export async function logRefundRequest(args: {
  userId: string
  evaluation: RefundEvaluation
  processedBy?: string | null
  stripeRefundId?: string | null
}): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('refund_requests')
    .insert({
      user_id: args.userId,
      billing_history_id: args.evaluation.billingHistoryId,
      decision: args.evaluation.decision,
      reason_code: args.evaluation.reasonCode,
      reason_detail: args.evaluation.reasonDetail,
      days_since_purchase: args.evaluation.daysSincePurchase,
      lessons_opened: args.evaluation.lessonsOpened,
      lessons_completed: args.evaluation.lessonsCompleted,
      is_renewal_charge: args.evaluation.isRenewalCharge,
      courtesy_applied: args.evaluation.reasonCode === 'courtesy_renewal_no_completion',
      stripe_refund_id: args.stripeRefundId ?? null,
      processed_by: args.processedBy ?? null,
    })
    .select('id')
    .single()

  if (error) throw new AppError(500, error.message)
  return data.id as string
}

/** Attaches the Stripe refund id to an existing audit row after the refund succeeds. */
async function attachStripeRefundId(
  refundRequestId: string,
  stripeRefundId: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('refund_requests')
    .update({ stripe_refund_id: stripeRefundId })
    .eq('id', refundRequestId)
  if (error) {
    // The money is already refunded; surface loudly but don't throw away the id.
    console.error('[refund] failed to attach stripe_refund_id', refundRequestId, stripeRefundId, error.message)
  }
}

/**
 * Marks courtesy_refund_used when a courtesy renewal refund is approved.
 */
export async function applyCourtesyRefundFlag(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('users')
    .update({ courtesy_refund_used: true, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) throw new AppError(500, error.message)
}

/**
 * Issues a Stripe refund for a billing_history row when configured.
 *
 * Passes a deterministic idempotency key derived from the billing row id, so a
 * retry (double-click, network retry, re-run) returns the SAME Stripe refund
 * instead of charging back twice. Stripe itself also rejects a second full
 * refund of an already-fully-refunded charge, but the idempotency key makes the
 * happy-path retry safe and side-effect-free.
 */
export async function stripeRefundForBillingRow(
  billing: BillingRow
): Promise<string | null> {
  if (!env.stripeEnabled) return null

  let chargeId = billing.stripe_payment_intent_id

  if (!chargeId && billing.stripe_invoice_id) {
    const stripe = getStripe()
    const invoice = await stripe.invoices.retrieve(billing.stripe_invoice_id)
    chargeId =
      typeof (invoice as { charge?: string | null }).charge === 'string'
        ? ((invoice as { charge?: string | null }).charge ?? null)
        : null
  }

  if (!chargeId) {
    throw new AppError(502, 'No Stripe charge found for this payment')
  }

  const stripe = getStripe()
  const refund = await stripe.refunds.create(
    {
      charge: chargeId,
      reason: 'requested_by_customer',
    },
    { idempotencyKey: `refund:billing:${billing.id}` }
  )

  return refund.id
}

/**
 * Returns an existing refund for this billing row that already issued money in
 * Stripe, if any. Used to block duplicate refunds before we call Stripe again.
 */
async function existingStripeRefund(
  billingHistoryId: string | null
): Promise<{ id: string; stripe_refund_id: string | null } | null> {
  if (!billingHistoryId) return null
  const { data, error } = await supabaseAdmin
    .from('refund_requests')
    .select('id, stripe_refund_id')
    .eq('billing_history_id', billingHistoryId)
    .not('stripe_refund_id', 'is', null)
    .limit(1)
    .maybeSingle()
  if (error) throw new AppError(500, error.message)
  return (data as { id: string; stripe_refund_id: string | null } | null) ?? null
}

/**
 * Evaluates eligibility, optionally processes Stripe refund, and logs the outcome.
 */
export async function processRefundRequest(args: {
  userId: string
  billingHistoryId?: string | null
  processedBy?: string | null
  executeStripeRefund?: boolean
}): Promise<RefundEvaluation & { refundRequestId: string; stripeRefundId: string | null }> {
  const evaluation = await evaluateRefundEligibility(args)

  if (evaluation.decision !== 'approved') {
    const refundRequestId = await logRefundRequest({
      userId: args.userId,
      evaluation,
      processedBy: args.processedBy,
    })
    return { ...evaluation, refundRequestId, stripeRefundId: null }
  }

  // Idempotency guard: if this billing row was already refunded in Stripe, do
  // not issue a second refund. Return the existing record instead.
  const prior = await existingStripeRefund(evaluation.billingHistoryId)
  if (prior) {
    return { ...evaluation, refundRequestId: prior.id, stripeRefundId: prior.stripe_refund_id }
  }

  // Write the audit row BEFORE touching Stripe so a crash mid-refund still
  // leaves a record. The row starts without a stripe_refund_id; we attach it
  // after the refund succeeds.
  const refundRequestId = await logRefundRequest({
    userId: args.userId,
    evaluation,
    processedBy: args.processedBy,
    stripeRefundId: null,
  })

  let stripeRefundId: string | null = null
  if (args.executeStripeRefund) {
    const billing = await resolveBillingRow(args.userId, evaluation.billingHistoryId)
    if (!billing) throw new AppError(404, 'Billing record not found')
    // idempotency-keyed inside stripeRefundForBillingRow (key = billing row id).
    stripeRefundId = await stripeRefundForBillingRow(billing)
    if (stripeRefundId) {
      await attachStripeRefundId(refundRequestId, stripeRefundId)
    }
  }

  // Only burn the one-time courtesy flag once money has actually moved (or when
  // we are not executing a Stripe refund, i.e. a manual/marked refund).
  if (evaluation.reasonCode === 'courtesy_renewal_no_completion') {
    await applyCourtesyRefundFlag(args.userId)
  }

  return { ...evaluation, refundRequestId, stripeRefundId }
}
