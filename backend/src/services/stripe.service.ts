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

/** Human-readable coupon and promotion-code labels from Stripe discount objects. */
export function discountLabelsFromStripe(
  discounts: Stripe.Discount[] | null | undefined
): { couponLabel: string | null; promoCode: string | null } {
  if (!discounts?.length) {
    return { couponLabel: null, promoCode: null }
  }
  const coupons: string[] = []
  const promos: string[] = []
  for (const d of discounts) {
    const coupon = d.source?.coupon
    if (coupon && typeof coupon === 'object') {
      const c = coupon as Stripe.Coupon
      coupons.push(c.name || c.id)
    } else if (typeof coupon === 'string') {
      coupons.push(coupon)
    }
    const promo = d.promotion_code
    if (promo && typeof promo === 'object') {
      const p = promo as Stripe.PromotionCode
      if (p.code) promos.push(p.code)
    }
  }
  return {
    couponLabel: coupons.length ? [...new Set(coupons)].join(', ') : null,
    promoCode: promos.length ? [...new Set(promos)].join(', ') : null,
  }
}

/** Computes the first-cycle intro price in cents using STRIPE_INTRO_COUPON_ID. */
async function introAmountCentsForPrice(unitAmount: number): Promise<number | null> {
  if (!env.STRIPE_INTRO_COUPON_ID) return null
  try {
    const stripe = getStripe()
    const coupon = await stripe.coupons.retrieve(env.STRIPE_INTRO_COUPON_ID)
    if (coupon.amount_off) return Math.max(0, unitAmount - coupon.amount_off)
    if (coupon.percent_off) {
      return Math.round(unitAmount * (1 - coupon.percent_off / 100))
    }
    return null
  } catch {
    return null
  }
}

/** True when the invoice payload indicates coupons or promos were applied. */
function invoiceHadDiscount(invoice: Stripe.Invoice): boolean {
  return (
    (invoice.total_discount_amounts?.length ?? 0) > 0 ||
    (invoice.subtotal ?? 0) > (invoice.amount_paid ?? 0)
  )
}

/** Re-fetches an invoice with discount expansions when webhooks send minimal objects. */
async function invoiceWithDiscountDetails(
  invoice: Stripe.Invoice
): Promise<Stripe.Invoice> {
  if (!invoice.id || !invoiceHadDiscount(invoice)) return invoice
  return getStripe().invoices.retrieve(invoice.id, {
    expand: ['discounts', 'discounts.source.coupon', 'discounts.promotion_code'],
  })
}

/** Re-fetches a subscription with discount expansions for coupon/promo labels. */
async function subscriptionWithDiscountDetails(
  sub: Stripe.Subscription
): Promise<Stripe.Subscription> {
  if (!sub.discounts?.length) return sub
  return getStripe().subscriptions.retrieve(sub.id, {
    expand: ['discounts', 'discounts.source.coupon', 'discounts.promotion_code'],
  })
}

/**
 * Upserts a row in `subscriptions` from the latest Stripe Subscription object.
 * Called from webhook handlers AND from the checkout-success path so the UI
 * sees the new sub immediately even if the webhook is still in flight.
 */
export async function upsertSubscriptionFromStripe(
  sub: Stripe.Subscription
): Promise<void> {
  sub = await subscriptionWithDiscountDetails(sub)

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

  const { couponLabel, promoCode } = discountLabelsFromStripe(
    sub.discounts as Stripe.Discount[] | undefined
  )

  let introPrice: number | null = null
  if (intervalFromPriceId(priceId) === 'week_4' && price?.unit_amount) {
    const introCents = await introAmountCentsForPrice(price.unit_amount)
    if (introCents != null) introPrice = introCents / 100
  }

  const row = {
    user_id: userId,
    stripe_customer_id: sub.customer as string,
    stripe_subscription_id: sub.id,
    stripe_price_id: priceId,
    billing_interval: intervalFromPriceId(priceId),
    plan_name: planName,
    price: price ? (price.unit_amount ?? 0) / 100 : 0,
    intro_price: introPrice,
    coupon_label: couponLabel,
    promo_code: promoCode,
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

  const fullInvoice = await invoiceWithDiscountDetails(invoice)
  const discountCents = (fullInvoice.total_discount_amounts ?? []).reduce(
    (sum, d) => sum + (d.amount ?? 0),
    0
  )
  const { couponLabel, promoCode } = discountLabelsFromStripe(
    fullInvoice.discounts as Stripe.Discount[] | undefined
  )

  const { error } = await supabaseAdmin.from('billing_history').upsert(
    {
      user_id: mapping.user_id,
      stripe_invoice_id: invoice.id,
      stripe_payment_intent_id: chargeRef,
      amount: (invoice.amount_paid ?? 0) / 100,
      subtotal: (fullInvoice.subtotal ?? 0) / 100,
      discount_amount: discountCents / 100,
      coupon_label: couponLabel,
      promo_code: promoCode,
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

/**
 * AI chat credit balance for Premium users. Picked as "effectively unlimited":
 * 999999 chats is several lifetimes of usage, but still a hard ceiling in case
 * something runs away (a bug, abuse, etc). New free users start at 5 (defined
 * in the user_credits table default).
 */
const PREMIUM_CREDIT_BALANCE = 999_999
const FREE_CREDIT_BALANCE = 5

/**
 * After a subscription state change, sync the AI chat credit balance to match
 * the user's tier. Premium gets effectively unlimited; revoking access (e.g.
 * sub.deleted or canceled at period end) resets to the free allowance.
 *
 * Idempotent — running the same upsert twice produces the same balance.
 */
export async function syncCreditsForSubscription(
  sub: Stripe.Subscription
): Promise<void> {
  const userId = sub.metadata?.user_id
  if (!userId) {
    // Most subs created by our checkout always carry user_id metadata, so a
    // missing one is unusual — skip rather than guess.
    return
  }

  const accessStatuses = new Set(['active', 'trialing', 'past_due', 'paused'])
  const grantsAccess = accessStatuses.has(sub.status)
  const targetBalance = grantsAccess ? PREMIUM_CREDIT_BALANCE : FREE_CREDIT_BALANCE

  // upsert handles users who never had a credit row (rare but possible if
  // signup ran before the credit-default trigger was wired).
  const { error } = await supabaseAdmin
    .from('user_credits')
    .upsert(
      {
        user_id: userId,
        balance: targetBalance,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (error) {
    console.error('Failed to sync credits for', userId, error)
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
