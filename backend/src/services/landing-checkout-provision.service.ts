import type Stripe from 'stripe'
import { supabaseAdmin } from '../db/supabase.js'
import { getStripe } from '../lib/stripe.js'
import { AppError } from '../utils/error-handler.js'
import {
  findUserByEmail,
  normalizeEmail,
  provisionPasswordlessUser,
} from './provision-user.service.js'
import {
  scheduleWeek1Conversion,
  syncCreditsForSubscription,
  upsertSubscriptionFromStripe,
} from './stripe.service.js'
import { sendPostPaymentEmailsAsync } from './lifecycle-email.service.js'
import { sendPurchaseEventAsync as sendMetaPurchaseAsync } from './meta-capi.service.js'
import { sendPurchaseEventAsync as sendGa4PurchaseAsync } from './ga4-mp.service.js'
import { env } from '../config/env.js'

export type LandingProvisionResult = {
  userId: string
  email: string
  name: string
  alreadyProvisioned: boolean
}

/**
 * Reads the checkout email from Stripe session metadata and customer details.
 */
export function emailFromCheckoutSession(session: Stripe.Checkout.Session): string | null {
  const fromDetails = session.customer_details?.email?.trim()
  if (fromDetails) return normalizeEmail(fromDetails)

  const fromMeta = session.metadata?.email?.trim()
  if (fromMeta) return normalizeEmail(fromMeta)

  const fromCustomerEmail = session.customer_email?.trim()
  if (fromCustomerEmail) return normalizeEmail(fromCustomerEmail)

  return null
}

/**
 * Resolves a display name from session metadata or the linked quiz lead.
 */
async function resolveDisplayName(
  email: string,
  session: Stripe.Checkout.Session
): Promise<string> {
  const fromMeta = session.metadata?.name?.trim()
  if (fromMeta) return fromMeta

  // Scope by landing too: (email, landing) is unique, so without the landing
  // filter maybeSingle() would throw once a second landing exists.
  const { data: lead } = await supabaseAdmin
    .from('landing_quiz_submissions')
    .select('name')
    .eq('email', email)
    .eq('landing', session.metadata?.landing ?? 'usa')
    .maybeSingle()

  if (lead?.name?.trim()) return lead.name.trim()

  const fromStripe = session.customer_details?.name?.trim()
  if (fromStripe) return fromStripe

  return 'there'
}

/**
 * Returns a prior provision row for this checkout session, if webhook replay already ran.
 */
export async function getLandingCheckoutProvision(sessionId: string) {
  const { data, error } = await supabaseAdmin
    .from('landing_checkout_provisions')
    .select('user_id, email')
    .eq('stripe_checkout_session_id', sessionId)
    .maybeSingle()

  if (error) throw new AppError(500, error.message)
  return data as { user_id: string; email: string } | null
}

/**
 * Persists the Stripe customer mapping for a provisioned learner account.
 */
async function ensureStripeCustomerMapping(
  userId: string,
  stripeCustomerId: string
): Promise<void> {
  const { data: existing } = await supabaseAdmin
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing?.stripe_customer_id) {
    if (existing.stripe_customer_id !== stripeCustomerId) {
      console.warn(
        `[landing-provision] user ${userId} already mapped to ${existing.stripe_customer_id}, checkout used ${stripeCustomerId}`
      )
    }
    return
  }

  const { error } = await supabaseAdmin.from('stripe_customers').insert({
    user_id: userId,
    stripe_customer_id: stripeCustomerId,
  })

  if (error) {
    const { data: again } = await supabaseAdmin
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle()
    if (again?.stripe_customer_id) return
    throw new AppError(500, error.message)
  }
}

/**
 * Writes user_id onto Stripe customer and subscription objects for later webhook sync.
 */
async function attachUserIdToStripeResources(args: {
  userId: string
  customerId: string
  subscriptionId: string
}): Promise<void> {
  const stripe = getStripe()
  await stripe.customers.update(args.customerId, {
    metadata: { user_id: args.userId },
  })
  await stripe.subscriptions.update(args.subscriptionId, {
    metadata: { user_id: args.userId },
  })
}

/**
 * Derives the Purchase value (major currency units) reported to Meta/GA4.
 *
 * We report the RECURRING subscription price, not the discounted intro amount, so
 * value-based bidding optimizes toward true subscriber worth — and so the value
 * is consistent across every sale regardless of which intro coupon applied. Falls
 * back to the actual charged amount (`amount_total`) only if the recurring unit
 * price is somehow unavailable, so a real sale never reports $0.
 */
function purchaseAmountFromSession(
  session: Stripe.Checkout.Session,
  subscription: Stripe.Subscription
): {
  value: number
  currency: string
} {
  const item = subscription.items?.data?.[0]
  const recurringUnit = item?.price?.unit_amount
  let cents = typeof recurringUnit === 'number' && recurringUnit > 0 ? recurringUnit : 0
  let currency = item?.price?.currency ?? null

  if (!cents) {
    // Fallback: the amount actually charged this cycle (post-coupon first invoice).
    if (typeof session.amount_total === 'number' && session.amount_total > 0) {
      cents = session.amount_total
    }
    currency = currency ?? session.currency ?? null
  }

  return { value: Math.round(cents) / 100, currency: (currency ?? 'usd').toUpperCase() }
}

/**
 * Fires the server-side conversion events for a landing checkout — Meta Purchase
 * (Conversions API) and GA4 purchase (Measurement Protocol) — reusing the browser
 * ids from session metadata for dedup/attribution. Each is independently gated by
 * its own config; both are fire-and-forget and never throw.
 */
function firePurchaseEvent(
  session: Stripe.Checkout.Session,
  subscription: Stripe.Subscription,
  email: string
): void {
  const md = session.metadata ?? {}
  const { value, currency } = purchaseAmountFromSession(session, subscription)
  const plan = md.interval ?? null
  const variant = md.variant ?? null
  const utmSource = md.utm_source ?? null
  const utmCampaign = md.utm_campaign ?? null
  const gclid = md.gclid ?? null

  if (env.metaCapiEnabled) {
    sendMetaPurchaseAsync({
      // Deterministic, session-derived id shared with the BROWSER Purchase on the
      // success page — Meta dedups same-name events by id, so both Purchases must
      // use this. (The InitiateCheckout id would not dedup a Purchase.)
      eventId: `purchase_${session.id}`,
      email,
      value,
      currency,
      plan,
      fbp: md.fbp ?? null,
      fbc: md.fbc ?? null,
      variant,
      utmSource,
      utmCampaign,
      eventSourceUrl: env.USA_LANDING_URL,
    })
  }

  if (env.ga4MpEnabled) {
    sendGa4PurchaseAsync({
      clientId: md.ga4_client_id ?? null,
      transactionId: session.id,
      value,
      currency,
      plan,
      variant,
      utmSource,
      utmCampaign,
      gclid,
    })
  }
}

/**
 * Provisions (or reuses) a learner account after a USA landing Stripe Checkout completes.
 */
export async function provisionFromLandingCheckoutSession(
  session: Stripe.Checkout.Session,
  subscription: Stripe.Subscription
): Promise<LandingProvisionResult> {
  const sessionId = session.id
  const existing = await getLandingCheckoutProvision(sessionId)
  if (existing) {
    const profile = await findUserByEmail(existing.email)
    return {
      userId: existing.user_id,
      email: existing.email,
      name: profile?.name?.trim() || 'there',
      alreadyProvisioned: true,
    }
  }

  const email = emailFromCheckoutSession(session)
  if (!email) {
    throw new AppError(400, `Checkout session ${sessionId} has no customer email`)
  }

  const customerId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id ?? null

  if (!customerId) {
    throw new AppError(400, `Checkout session ${sessionId} has no Stripe customer`)
  }

  const name = await resolveDisplayName(email, session)
  const { userId } = await provisionPasswordlessUser({
    email,
    name,
    source: 'usa_checkout',
  })

  await attachUserIdToStripeResources({
    userId,
    customerId,
    subscriptionId: subscription.id,
  })

  subscription.metadata = { ...subscription.metadata, user_id: userId }
  await ensureStripeCustomerMapping(userId, customerId)

  // "1 Week" is sold as one intro week that converts to the 4-week price. The
  // conversion can only be attached after checkout creates the subscription.
  // Runs before the upsert so the stored subscription reflects the schedule.
  if (session.metadata?.two_phase === 'week_1_to_4week') {
    await scheduleWeek1Conversion(subscription, {
      email,
      userId,
      checkoutSessionId: sessionId,
    })
  }

  await upsertSubscriptionFromStripe(subscription)
  await syncCreditsForSubscription(subscription)

  const { error: logError } = await supabaseAdmin
    .from('landing_checkout_provisions')
    .insert({
      stripe_checkout_session_id: sessionId,
      user_id: userId,
      stripe_subscription_id: subscription.id,
      email,
    })

  if (logError) {
    console.error('[landing-provision] failed to log provision', sessionId, logError.message)
  }

  sendPostPaymentEmailsAsync({ userId, email, name })
  // Fire the Meta Purchase ONLY when the dedup row persisted. The row (unique on
  // stripe_checkout_session_id) is the single source of truth for "Purchase
  // already sent" — if the insert failed, a later re-delivery could re-provision
  // and we must not double-count, so we skip the event rather than risk it.
  if (!logError) {
    firePurchaseEvent(session, subscription, email)
  }

  return { userId, email, name, alreadyProvisioned: false }
}

/**
 * True when the checkout session originated from the USA landing payment-first funnel.
 */
export function isLandingCheckoutSession(session: Stripe.Checkout.Session): boolean {
  return session.metadata?.source === 'usa_landing'
}
