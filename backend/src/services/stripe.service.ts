import type Stripe from 'stripe'
import { env } from '../config/env.js'
import { supabaseAdmin } from '../db/supabase.js'
import { AppError } from '../utils/error-handler.js'
import { getStripe } from '../lib/stripe.js'

/**
 * Returns the Stripe customer id for `userId`, creating one in Stripe and
 * persisting the mapping on first call. The mapping lives independent of
 * any active subscription so the same customer survives cancel+resubscribe.
 */
export async function getOrCreateCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<string> {
  const { data: existing, error: selectError } = await supabaseAdmin
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (selectError) throw new AppError(500, selectError.message)
  if (existing?.stripe_customer_id) return existing.stripe_customer_id

  const stripe = getStripe()
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { user_id: userId },
  })

  const { error: insertError } = await supabaseAdmin
    .from('stripe_customers')
    .insert({ user_id: userId, stripe_customer_id: customer.id })

  if (insertError) {
    // If two requests race, the unique constraint protects us — re-read.
    const { data: again } = await supabaseAdmin
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle()
    if (again?.stripe_customer_id) return again.stripe_customer_id
    throw new AppError(500, insertError.message)
  }

  return customer.id
}

/** Map our internal billing-interval key to the configured Stripe price id. */
export function resolvePriceId(interval: 'week_4' | 'year'): string {
  const id =
    interval === 'year' ? env.STRIPE_PRICE_YEARLY : env.STRIPE_PRICE_4WEEK
  if (!id) {
    throw new AppError(503, `Stripe price for "${interval}" is not configured`)
  }
  return id
}

/** Inverse of resolvePriceId — used when syncing data back from Stripe. */
export function intervalFromPriceId(
  priceId: string | null | undefined
): 'week_4' | 'year' | null {
  if (!priceId) return null
  if (priceId === env.STRIPE_PRICE_YEARLY) return 'year'
  if (priceId === env.STRIPE_PRICE_4WEEK) return 'week_4'
  return null
}

interface CheckoutInput {
  userId: string
  userEmail: string
  userName?: string
  interval: 'week_4' | 'year'
  /** When true, attach the intro coupon (first-cycle $15.19). Yearly plans skip it. */
  applyIntro: boolean
}

/**
 * Creates a Stripe Checkout Session in subscription mode and returns its URL.
 * Success/cancel redirects land back on /settings with a query flag so the UI
 * can show a toast and refetch the subscription.
 */
export async function createCheckoutSession(
  input: CheckoutInput
): Promise<string> {
  const stripe = getStripe()
  const customerId = await getOrCreateCustomer(
    input.userId,
    input.userEmail,
    input.userName
  )
  const priceId = resolvePriceId(input.interval)

  const discounts: Array<{ coupon: string }> = []
  if (input.applyIntro && env.STRIPE_INTRO_COUPON_ID) {
    discounts.push({ coupon: env.STRIPE_INTRO_COUPON_ID })
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    // metadata on both session and subscription so webhooks can attribute either.
    metadata: { user_id: input.userId },
    subscription_data: {
      metadata: { user_id: input.userId },
    },
    discounts: discounts.length ? discounts : undefined,
    allow_promotion_codes: discounts.length ? undefined : true,
    success_url: `${env.APP_URL}/settings?section=plan&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.APP_URL}/settings?section=plan&checkout=cancel`,
  })

  if (!session.url) throw new AppError(500, 'Stripe did not return a session URL')
  return session.url
}

/** Creates a hosted Customer Portal session for the user, returns its URL. */
export async function createPortalSession(
  userId: string,
  userEmail: string,
  userName?: string
): Promise<string> {
  const stripe = getStripe()
  const customerId = await getOrCreateCustomer(userId, userEmail, userName)
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${env.APP_URL}/settings?section=plan`,
  })
  return portal.url
}

/**
 * Extracts the price id of the first subscription item. Subscriptions can in
 * theory have multiple line items, but we only ever sell single-line plans.
 */
function primaryPriceId(sub: Stripe.Subscription): string | null {
  const first = sub.items.data[0]
  return first?.price.id ?? null
}

function toIso(seconds: number | null | undefined): string | null {
  if (!seconds) return null
  return new Date(seconds * 1000).toISOString()
}

/**
 * Upserts a row in `subscriptions` from the latest Stripe Subscription object.
 * Called from webhook handlers AND from the checkout-success path so the UI
 * sees the new sub immediately even if the webhook is still in flight.
 */
export async function upsertSubscriptionFromStripe(
  sub: Stripe.Subscription
): Promise<void> {
  // The user_id is on subscription.metadata (set in createCheckoutSession);
  // fall back to the customer object's metadata if missing (very old subs).
  let userId = sub.metadata?.user_id
  if (!userId) {
    const stripe = getStripe()
    const customer = await stripe.customers.retrieve(sub.customer as string)
    if (customer && !customer.deleted) {
      userId = (customer.metadata as Record<string, string>)?.user_id
    }
  }
  if (!userId) {
    console.warn(
      `Stripe subscription ${sub.id} has no user_id metadata; skipping sync`
    )
    return
  }

  const priceId = primaryPriceId(sub)
  const price = sub.items.data[0]?.price
  const planName =
    intervalFromPriceId(priceId) === 'year'
      ? 'Yearly plan'
      : '4-week subscription'

  // In API 2026-04-22 current_period_* moved off the subscription onto the item.
  const item = sub.items.data[0]
  const renewalIso = toIso(item?.current_period_end)
  const renewalDate = renewalIso ? renewalIso.slice(0, 10) : null

  const row = {
    user_id: userId,
    stripe_customer_id: sub.customer as string,
    stripe_subscription_id: sub.id,
    stripe_price_id: priceId,
    billing_interval: intervalFromPriceId(priceId),
    plan_name: planName,
    price: price ? (price.unit_amount ?? 0) / 100 : 0,
    currency: price?.currency ?? 'usd',
    status: sub.status,
    cancel_at_period_end: sub.cancel_at_period_end,
    current_period_start: toIso(item?.current_period_start),
    current_period_end: renewalIso,
    renewal_date: renewalDate,
    trial_end: toIso(sub.trial_end),
    paused_at:
      sub.pause_collection || sub.status === 'paused'
        ? new Date().toISOString()
        : null,
  }

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .upsert(row, { onConflict: 'user_id' })

  if (error) {
    console.error('Failed to upsert subscription', sub.id, error)
    throw error
  }
}

/** Inserts a billing_history row from a Stripe invoice. Idempotent on stripe_invoice_id. */
export async function recordInvoicePayment(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string
  if (!customerId) return

  // Find which user this customer belongs to.
  const { data: mapping } = await supabaseAdmin
    .from('stripe_customers')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (!mapping?.user_id) {
    console.warn(
      `Invoice ${invoice.id} for unknown customer ${customerId}; skipping`
    )
    return
  }

  const paidAt = invoice.status_transitions?.paid_at ?? invoice.created
  const firstLine = invoice.lines.data[0]
  // `pricing.price_details.price` replaces the old top-level `price` field on lines.
  const linePriceId =
    typeof firstLine?.pricing?.price_details?.price === 'string'
      ? firstLine.pricing.price_details.price
      : (firstLine?.pricing?.price_details?.price as Stripe.Price | undefined)?.id ?? null

  const description =
    firstLine?.description ??
    (intervalFromPriceId(linePriceId) === 'year'
      ? 'Yearly subscription'
      : '4 week subscription plan')

  // `invoice.payment_intent` was removed in 2026-04-22; fall back to `charge`,
  // which is still a string id on the Invoice object.
  const chargeRef =
    typeof (invoice as { charge?: string | null }).charge === 'string'
      ? ((invoice as { charge?: string | null }).charge ?? null)
      : null

  const { error } = await supabaseAdmin.from('billing_history').upsert(
    {
      user_id: mapping.user_id,
      stripe_invoice_id: invoice.id,
      stripe_payment_intent_id: chargeRef,
      amount: (invoice.amount_paid ?? 0) / 100,
      currency: invoice.currency ?? 'usd',
      description,
      paid_at: toIso(paidAt) ?? new Date().toISOString(),
      invoice_url: invoice.hosted_invoice_url ?? null,
      invoice_pdf: invoice.invoice_pdf ?? null,
      status: invoice.status ?? null,
    },
    { onConflict: 'stripe_invoice_id' }
  )

  if (error) {
    console.error('Failed to upsert billing_history', invoice.id, error)
    throw error
  }
}

/** True if this Stripe event id has already been processed. */
export async function isEventProcessed(eventId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('stripe_events')
    .select('id')
    .eq('id', eventId)
    .maybeSingle()
  return Boolean(data)
}

/** Record that this Stripe event has been processed (idempotency). */
export async function markEventProcessed(
  eventId: string,
  type: string
): Promise<void> {
  await supabaseAdmin
    .from('stripe_events')
    .insert({ id: eventId, type })
    .select()
    .maybeSingle()
}
