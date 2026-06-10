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
  syncCreditsForSubscription,
  upsertSubscriptionFromStripe,
} from './stripe.service.js'
import { sendPostPaymentEmailsAsync } from './lifecycle-email.service.js'

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

  const { data: lead } = await supabaseAdmin
    .from('landing_quiz_submissions')
    .select('name')
    .eq('email', email)
    .maybeSingle()

  if (lead?.name?.trim()) return lead.name.trim()

  const fromStripe = session.customer_details?.name?.trim()
  if (fromStripe) return fromStripe

  return 'there'
}

/**
 * Returns a prior provision row for this checkout session, if webhook replay already ran.
 */
async function findExistingProvision(sessionId: string) {
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
 * Provisions (or reuses) a learner account after a USA landing Stripe Checkout completes.
 */
export async function provisionFromLandingCheckoutSession(
  session: Stripe.Checkout.Session,
  subscription: Stripe.Subscription
): Promise<LandingProvisionResult> {
  const sessionId = session.id
  const existing = await findExistingProvision(sessionId)
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

  return { userId, email, name, alreadyProvisioned: false }
}

/**
 * True when the checkout session originated from the USA landing payment-first funnel.
 */
export function isLandingCheckoutSession(session: Stripe.Checkout.Session): boolean {
  return session.metadata?.source === 'usa_landing'
}
