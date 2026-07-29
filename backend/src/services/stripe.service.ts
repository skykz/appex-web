import type Stripe from 'stripe'
import { env } from '../config/env.js'
import { supabaseAdmin } from '../db/supabase.js'
import { AppError } from '../utils/error-handler.js'
import { getStripe } from '../lib/stripe.js'
import { paymentLog } from '../lib/logger.js'
import { findUserByEmail, normalizeEmail } from './provision-user.service.js'
import { hasAccess } from './access.service.js'
import {
  sendAccessLockedEmailAsync,
  sendPaymentFailedNoticeAsync,
  sendSubscriptionExpiredAsync,
} from './lifecycle-email.service.js'
import { PAYMENT_GRACE_PERIOD_MS } from './subscription-access.js'
import { raiseBillingAlert } from './billing-alert.service.js'

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

/** Supported subscription billing cadences (maps to Stripe price ids in env). */
export type BillingInterval = 'week_1' | 'week_4' | 'year'

/** Map our internal billing-interval key to the configured Stripe price id. */
export function resolvePriceId(interval: BillingInterval): string {
  const ids: Record<BillingInterval, string | undefined> = {
    week_1: env.STRIPE_PRICE_1WEEK,
    week_4: env.STRIPE_PRICE_4WEEK,
    year: env.STRIPE_PRICE_YEARLY,
  }
  const id = ids[interval]
  if (!id) {
    throw new AppError(503, `Stripe price for "${interval}" is not configured`)
  }
  return id
}

/** Inverse of resolvePriceId — used when syncing data back from Stripe. */
export function intervalFromPriceId(
  priceId: string | null | undefined
): BillingInterval | null {
  if (!priceId) return null
  if (priceId === env.STRIPE_PRICE_YEARLY) return 'year'
  if (priceId === env.STRIPE_PRICE_4WEEK) return 'week_4'
  if (priceId === env.STRIPE_PRICE_1WEEK) return 'week_1'
  return null
}

/** Human-readable plan name stored on the subscription row. */
export function planNameFromInterval(interval: BillingInterval | null): string {
  switch (interval) {
    case 'year':
      return 'Yearly plan'
    case 'week_4':
      return '4-week subscription'
    case 'week_1':
      return '1-week subscription'
    default:
      return 'Premium subscription'
  }
}

/** Invoice line description keyed by billing interval. */
export function invoiceDescriptionFromInterval(interval: BillingInterval | null): string {
  switch (interval) {
    case 'year':
      return 'Yearly subscription'
    case 'week_4':
      return '4 week subscription plan'
    case 'week_1':
      return '1 week subscription plan'
    default:
      return 'Subscription plan'
  }
}

/**
 * True when the user has never completed a paid subscription — eligible for the
 * shared first-time intro coupon on any plan interval.
 */
export async function userEligibleForIntroCoupon(userId: string): Promise<boolean> {
  const { data: paid, error: billingError } = await supabaseAdmin
    .from('billing_history')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()
  if (billingError) throw new AppError(500, billingError.message)
  if (paid) return false

  const { data: sub, error: subError } = await supabaseAdmin
    .from('subscriptions')
    .select('stripe_subscription_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (subError) throw new AppError(500, subError.message)
  return !sub?.stripe_subscription_id
}

/**
 * Discount tier requested by the paywall.
 * - `intro`   — default offer (61% off)
 * - `exit`    — exit-intent upgrade (71% off)
 * - `expired` — the countdown ran out; charge full price
 *
 * This is a *hint* from the client, never a price. The server resolves the
 * actual coupon id, so a tampered request can at worst ask for a discount tier
 * we already publish — it can never invent an amount or name a coupon.
 */
export type DiscountTier = 'intro' | 'exit' | 'expired'

/** Resolves the Stripe coupon id for a first-time intro checkout on the given plan. */
export function introCouponIdForInterval(interval: BillingInterval): string | undefined {
  const byPlan: Record<BillingInterval, string | undefined> = {
    week_1: env.STRIPE_INTRO_COUPON_1WEEK,
    week_4: env.STRIPE_INTRO_COUPON_4WEEK ?? env.STRIPE_INTRO_COUPON_ID,
    year: env.STRIPE_INTRO_COUPON_YEAR,
  }
  return byPlan[interval]
}

/** Resolves the 71% exit-intent coupon id for the given plan, if configured. */
export function exitCouponIdForInterval(interval: BillingInterval): string | undefined {
  const byPlan: Record<BillingInterval, string | undefined> = {
    week_1: env.STRIPE_EXIT_COUPON_1WEEK,
    week_4: env.STRIPE_EXIT_COUPON_4WEEK,
    year: env.STRIPE_EXIT_COUPON_YEAR,
  }
  return byPlan[interval]
}

/**
 * Resolves the coupon to attach for a given plan + discount tier.
 *
 * `expired` attaches nothing (full price). `exit` falls back to the intro coupon
 * when no exit coupon is configured, so a missing env var under-charges rather
 * than billing someone the full price we just promised them a discount off.
 */
export function couponIdForTier(
  interval: BillingInterval,
  tier: DiscountTier
): string | undefined {
  if (tier === 'expired') return undefined
  if (tier === 'exit') {
    return exitCouponIdForInterval(interval) ?? introCouponIdForInterval(interval)
  }
  return introCouponIdForInterval(interval)
}

interface CheckoutInput {
  userId: string
  userEmail: string
  userName?: string
  interval: BillingInterval
  /** When true, attach the intro coupon on the first checkout cycle. */
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
  if (input.applyIntro) {
    const couponId = introCouponIdForInterval(input.interval)
    if (couponId) discounts.push({ coupon: couponId })
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

export interface LandingCheckoutInput {
  email: string
  name?: string
  interval: BillingInterval
  landing?: string
  /**
   * Correlation id from the HTTP request, threaded through so the pricing and
   * session logs join to the originating `checkout.requested` line.
   */
  reqId?: string
  /**
   * Discount tier the paywall was showing. Defaults to `intro` so an older
   * client that doesn't send the field still gets the standard 61% offer.
   */
  tier?: DiscountTier
  /** Meta attribution stored on the session for server-side Purchase dedup. */
  meta?: {
    eventId?: string
    fbp?: string
    fbc?: string
  }
  /** GA4 attribution stored on the session for the server-side Measurement Protocol purchase. */
  ga4?: {
    clientId?: string
  }
  /** Creative/UTM attribution stamped on the session for Purchase reporting. */
  attribution?: {
    variant?: string
    utmSource?: string
    utmCampaign?: string
    /** Google Ads click id — for server-side Google Ads conversion attribution. */
    gclid?: string
  }
}

/**
 * Creates a public Stripe Checkout Session for the USA landing (no account required yet).
 * User provisioning and magic-link email happen in the checkout.session.completed webhook.
 */
export async function createLandingCheckoutSession(
  input: LandingCheckoutInput
): Promise<string> {
  if (!env.stripeEnabled) {
    throw new AppError(503, 'Stripe is not configured')
  }

  const email = normalizeEmail(input.email)
  const landingUrl = (env.USA_LANDING_URL ?? env.APP_URL).replace(/\/+$/, '')
  const stripe = getStripe()
  const priceId = resolvePriceId(input.interval)

  const existingUser = await findUserByEmail(email)
  if (existingUser) {
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('status')
      .eq('user_id', existingUser.id)
      .maybeSingle()

    if (
      sub &&
      ['active', 'trialing', 'past_due', 'paused'].includes(sub.status as string)
    ) {
      throw new AppError(
        409,
        'You already have an active subscription. Check your email to sign in.'
      )
    }
  }

  let applyIntro = true
  if (existingUser) {
    applyIntro = await userEligibleForIntroCoupon(existingUser.id)
  }

  // Returning payers never get a first-time discount, whatever tier the paywall
  // claimed; otherwise the server picks the coupon for the requested tier.
  const tier: DiscountTier = applyIntro ? (input.tier ?? 'intro') : 'expired'
  const discounts: Array<{ coupon: string }> = []
  const tierCoupon = couponIdForTier(input.interval, tier)
  if (tierCoupon) discounts.push({ coupon: tierCoupon })

  // The pricing decision, recorded before Stripe is called. This is what you
  // check when a customer says they were charged the wrong amount: it shows the
  // tier the paywall claimed, the tier actually granted, and the coupon used.
  paymentLog.info('checkout.pricing_resolved', {
    reqId: input.reqId,
    email,
    interval: input.interval,
    requestedTier: input.tier ?? 'intro',
    grantedTier: tier,
    couponId: tierCoupon ?? null,
    isReturningUser: Boolean(existingUser),
    introEligible: applyIntro,
    landing: input.landing ?? 'usa',
  })

  // A promised discount that resolves to no coupon means the customer sees a
  // sale price and gets billed full price — the one failure mode here that is
  // worse than an outage, so it is flagged loudly rather than logged as info.
  if (tier !== 'expired' && !tierCoupon) {
    paymentLog.error('checkout.coupon_missing', {
      reqId: input.reqId,
      email,
      interval: input.interval,
      tier,
      hint: `No Stripe coupon configured for ${input.interval}/${tier}; customer will be charged full price.`,
    })
  }

  const landing = input.landing ?? 'usa'
  // "1 Week" is a two-phase plan: 7 days at the weekly intro price, then it
  // converts to the 4-week price forever — exactly what the paywall advertises
  // ("$6.93 today, then $38.95 every 4 weeks"). Checkout bills phase 1; the
  // webhook attaches a Subscription Schedule that flips it to phase 2 at day 7.
  const isTwoPhaseWeek = input.interval === 'week_1' && Boolean(env.STRIPE_PRICE_1WEEK_INTRO)
  const checkoutPriceId = isTwoPhaseWeek
    ? (env.STRIPE_PRICE_1WEEK_INTRO as string)
    : priceId

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: email,
    line_items: [{ price: checkoutPriceId, quantity: 1 }],
    metadata: {
      source: 'usa_landing',
      landing,
      interval: input.interval,
      email,
      // Which discount tier actually applied — lets you reconcile 61% vs 71% vs
      // full-price sales in Stripe without re-deriving it from the coupon id.
      discount_tier: tier,
      // Tells provisioning to convert this subscription to the 4-week price
      // after the single intro week (see scheduleWeek1Conversion).
      ...(isTwoPhaseWeek ? { two_phase: 'week_1_to_4week' } : {}),
      ...(input.name?.trim() ? { name: input.name.trim() } : {}),
      // Meta attribution for the server-side Purchase event (read in provisioning).
      ...(input.meta?.eventId ? { meta_event_id: input.meta.eventId } : {}),
      ...(input.meta?.fbp ? { fbp: input.meta.fbp } : {}),
      ...(input.meta?.fbc ? { fbc: input.meta.fbc } : {}),
      ...(input.ga4?.clientId ? { ga4_client_id: input.ga4.clientId } : {}),
      // Creative/UTM attribution for Purchase reporting (which ad drove the sale).
      ...(input.attribution?.variant ? { variant: input.attribution.variant } : {}),
      ...(input.attribution?.utmSource ? { utm_source: input.attribution.utmSource } : {}),
      ...(input.attribution?.utmCampaign ? { utm_campaign: input.attribution.utmCampaign } : {}),
      ...(input.attribution?.gclid ? { gclid: input.attribution.gclid } : {}),
    },
    subscription_data: {
      metadata: {
        source: 'usa_landing',
        landing,
        interval: input.interval,
        email,
      },
    },
    discounts: discounts.length ? discounts : undefined,
    allow_promotion_codes: discounts.length ? undefined : true,
    success_url: `${landingUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${landingUrl}/paywall?checkout=cancel`,
  })

  if (!session.url) throw new AppError(500, 'Stripe did not return a session URL')

  // Links our request to the Stripe object: given a session id from the Stripe
  // dashboard you can find the tier and price that produced it, and vice versa.
  paymentLog.info('checkout.session_created', {
    reqId: input.reqId,
    sessionId: session.id,
    email,
    interval: input.interval,
    tier,
    couponId: tierCoupon ?? null,
    amountTotal: session.amount_total,
    currency: session.currency,
  })

  return session.url
}

/**
 * Who to name in a failed-conversion alert. The subscription's own metadata is
 * used as a fallback, but the caller usually knows the resolved user and the
 * checkout session, which makes the alert directly actionable.
 */
export interface Week1AlertContext {
  email?: string | null
  userId?: string | null
  checkoutSessionId?: string | null
}

/**
 * Converts a paid "1 Week" subscription into its two-phase schedule:
 *   phase 1 — the intro week already paid for at checkout ($17.77/week, minus
 *             the tier coupon), exactly 1 iteration;
 *   phase 2 — the 4-week price ($38.95), renewing indefinitely.
 *
 * Checkout can only create a single-price subscription, so the conversion is
 * attached here, after payment. Without it the customer would keep renewing
 * weekly at $17.77 — contradicting the disclosure they agreed to.
 *
 * Safe to call more than once: a subscription that already has a schedule is
 * left alone. Never throws — a failed conversion must not break provisioning.
 * Instead every failure path raises a `week1_conversion_failed` billing alert,
 * because the fallback state (renewing weekly at full price) overcharges the
 * customer relative to the disclosure and needs a manual fix in Stripe.
 */
export async function scheduleWeek1Conversion(
  subscription: Stripe.Subscription,
  alertContext?: Week1AlertContext
): Promise<void> {
  /**
   * Stamps the new schedule id onto the caller's subscription object.
   *
   * The caller passes this same object straight to upsertSubscriptionFromStripe,
   * which reads `sub.schedule` to look up the upcoming phase. Creating the
   * schedule in Stripe does NOT mutate our in-memory copy, so without this the
   * stored row would have null next_phase_* and the UI would keep showing the
   * intro weekly price as if it never converts.
   */
  const stampSchedule = (scheduleId: string) => {
    subscription.schedule = scheduleId as unknown as Stripe.Subscription['schedule']
  }
  /** Reports a failed conversion to ops — see raiseBillingAlert. */
  const alert = (detail: string, context?: Record<string, unknown>) =>
    raiseBillingAlert({
      type: 'week1_conversion_failed',
      detail,
      email: alertContext?.email ?? subscription.metadata?.email ?? null,
      userId: alertContext?.userId ?? subscription.metadata?.user_id ?? null,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId:
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id ?? null,
      stripeCheckoutSessionId: alertContext?.checkoutSessionId ?? null,
      context: {
        target_4week_price: env.STRIPE_PRICE_4WEEK ?? null,
        current_price: subscription.items.data[0]?.price?.id ?? null,
        ...context,
      },
    })

  const fourWeekPrice = env.STRIPE_PRICE_4WEEK
  if (!fourWeekPrice) {
    await alert('STRIPE_PRICE_4WEEK is not configured, so there is no price to convert to.')
    return
  }
  // Already scheduled (webhook replay, or converted on an earlier attempt).
  if (subscription.schedule) return

  try {
    const stripe = getStripe()
    const introPriceId = subscription.items.data[0]?.price?.id
    if (!introPriceId) {
      await alert('Subscription has no line-item price to convert from.')
      return
    }

    // Adopt the live subscription into a schedule, then describe both phases.
    const schedule = await stripe.subscriptionSchedules.create({
      from_subscription: subscription.id,
    })

    // `from_subscription` seeds phase 1 from the current subscription; keep its
    // dates and discount, cap it at one iteration, then append the 4-week phase.
    const current = schedule.phases[0]
    // Carry over the checkout coupon by id — the read-back discount objects
    // aren't accepted verbatim as update params.
    const introCoupons = (current.discounts ?? [])
      .map((d) => (typeof d.coupon === 'string' ? d.coupon : d.coupon?.id))
      .filter((id): id is string => Boolean(id))
      .map((coupon) => ({ coupon }))

    const updated = await stripe.subscriptionSchedules.update(schedule.id, {
      end_behavior: 'release',
      phases: [
        {
          items: [{ price: introPriceId, quantity: 1 }],
          start_date: current.start_date,
          end_date: current.end_date,
          // Preserve the intro coupon that was applied at checkout.
          ...(introCoupons.length ? { discounts: introCoupons } : {}),
        },
        {
          items: [{ price: fourWeekPrice, quantity: 1 }],
          // No iterations/end_date → renews at $38.95 every 4 weeks until cancelled.
        },
      ],
    })

    // Don't trust the call returning 200 — confirm the schedule actually ends on
    // the 4-week price. A schedule that silently kept only the weekly phase is
    // the exact failure this alert exists to catch, and it would otherwise look
    // like success right up until the customer is billed weekly.
    const finalPhase = updated.phases[updated.phases.length - 1]
    const finalPrices = (finalPhase?.items ?? []).map((i) =>
      typeof i.price === 'string' ? i.price : i.price?.id
    )
    // Make the schedule visible to the caller's copy of the subscription, so the
    // upsert that follows can resolve the upcoming $38.95 phase.
    stampSchedule(updated.id)

    if (updated.phases.length < 2 || !finalPrices.includes(fourWeekPrice)) {
      await alert(
        'Schedule was updated but its final phase is not the 4-week price — ' +
          'the subscription may still renew weekly.',
        { schedule_id: updated.id, phase_count: updated.phases.length, final_prices: finalPrices }
      )
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    console.error(`[stripe] week_1 conversion failed for ${subscription.id}: ${msg}`)
    await alert(msg)
  }
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

/** Renders a Stripe recurring interval as the cadence copy the UI shows. */
function cadenceLabel(interval: string, count: number): string {
  if (interval === 'year') return count === 1 ? 'every year' : `every ${count} years`
  if (interval === 'month') return count === 1 ? 'every month' : `every ${count} months`
  if (interval === 'week') return count === 1 ? 'every week' : `every ${count} weeks`
  if (interval === 'day') return count === 1 ? 'every day' : `every ${count} days`
  return `every ${count} ${interval}`
}

/**
 * Resolves the upcoming price change for a scheduled subscription (today only the
 * "1 Week" plan, which converts to the 4-week price after its intro week).
 *
 * Returns null when there is no schedule, or when the schedule has no phase after
 * the current one — i.e. the price shown to the customer is already the final one.
 *
 * Never throws: this only enriches what Plan management displays, so a failed
 * lookup must not break subscription syncing on the webhook path.
 */
async function resolveNextPhase(
  sub: Stripe.Subscription
): Promise<{ price: number; startsAt: string; cadence: string } | null> {
  if (!sub.schedule) return null

  try {
    const stripe = getStripe()
    const scheduleId = typeof sub.schedule === 'string' ? sub.schedule : sub.schedule.id
    const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId)

    // The phase that starts after the current one ends. Compare against the
    // subscription's own period end rather than "now": a webhook can arrive
    // mid-phase, and we always want the NEXT change, not the current phase.
    const currentEnd = sub.items.data[0]?.current_period_end ?? 0
    const upcoming = schedule.phases.find((p) => (p.start_date ?? 0) >= currentEnd)
    if (!upcoming) return null

    const item = upcoming.items?.[0]
    const priceRef = item?.price
    if (!priceRef) return null

    const priceId = typeof priceRef === 'string' ? priceRef : priceRef.id
    const priceObj = await stripe.prices.retrieve(priceId)
    if (priceObj.unit_amount == null) return null

    // A phase priced the same as the current one is not worth announcing.
    const currentAmount = sub.items.data[0]?.price?.unit_amount
    if (currentAmount != null && priceObj.unit_amount === currentAmount) return null

    const rec = priceObj.recurring
    return {
      price: priceObj.unit_amount / 100,
      startsAt: new Date((upcoming.start_date ?? 0) * 1000).toISOString(),
      cadence: rec ? cadenceLabel(rec.interval, rec.interval_count ?? 1) : '',
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    console.error(`[stripe] could not resolve next phase for ${sub.id}: ${msg}`)
    return null
  }
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
  const billingInterval = intervalFromPriceId(priceId)
  const planName = planNameFromInterval(billingInterval)

  // In API 2026-04-22 current_period_* moved off the subscription onto the item.
  const item = sub.items.data[0]
  const renewalIso = toIso(item?.current_period_end)
  const renewalDate = renewalIso ? renewalIso.slice(0, 10) : null

  const { couponLabel, promoCode } = discountLabelsFromStripe(
    sub.discounts as Stripe.Discount[] | undefined
  )

  let introPrice: number | null = null
  if (billingInterval && price?.unit_amount && (couponLabel || promoCode)) {
    const introCents = await introAmountCentsForPrice(price.unit_amount)
    if (introCents != null) introPrice = introCents / 100
  }

  const nextPhase = await resolveNextPhase(sub)

  const { data: existingSub } = await supabaseAdmin
    .from('subscriptions')
    .select('status, cancel_at_period_end, payment_failed_at, payment_failed_count')
    .eq('user_id', userId)
    .maybeSingle()

  const scheduledCancelEnding =
    sub.status === 'canceled' &&
    existingSub?.cancel_at_period_end === true &&
    (existingSub.status === 'active' || existingSub.status === 'trialing')

  let paymentFailedAt: string | null = existingSub?.payment_failed_at ?? null
  let paymentFailedCount = existingSub?.payment_failed_count ?? 0
  if (sub.status === 'active' || sub.status === 'trialing') {
    paymentFailedAt = null
    paymentFailedCount = 0
  } else if (sub.status === 'past_due' && !paymentFailedAt) {
    paymentFailedAt = new Date().toISOString()
  }

  const row = {
    user_id: userId,
    stripe_customer_id: sub.customer as string,
    stripe_subscription_id: sub.id,
    stripe_price_id: priceId,
    billing_interval: billingInterval,
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
    payment_failed_at: paymentFailedAt,
    payment_failed_count: paymentFailedCount,
    next_phase_price: nextPhase?.price ?? null,
    next_phase_starts_at: nextPhase?.startsAt ?? null,
    next_phase_cadence: nextPhase?.cadence ?? null,
  }

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .upsert(row, { onConflict: 'user_id' })

  if (error) {
    console.error('Failed to upsert subscription', sub.id, error)
    throw error
  }

  if (scheduledCancelEnding) {
    sendSubscriptionExpiredAsync(userId, renewalIso)
  }

  await syncCreditsForUser(userId)
}

/**
 * Resolves the AppEx user id for a Stripe customer id.
 */
async function userIdFromStripeCustomer(customerId: string): Promise<string | null> {
  const { data: mapping } = await supabaseAdmin
    .from('stripe_customers')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  return mapping?.user_id ?? null
}

/**
 * Handles invoice.payment_failed: first failure starts grace + notice; second locks access.
 */
export async function markPaymentFailedFromInvoice(
  invoice: Stripe.Invoice
): Promise<void> {
  const customerId = invoice.customer as string
  if (!customerId) return

  const userId = await userIdFromStripeCustomer(customerId)
  if (!userId) {
    console.warn(
      `Invoice ${invoice.id} payment failed for unknown customer ${customerId}; skipping grace mark`
    )
    return
  }

  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('payment_failed_at, payment_failed_count, current_period_end')
    .eq('user_id', userId)
    .maybeSingle()

  const periodEnd = (sub?.current_period_end as string | null) ?? null
  const previousCount = sub?.payment_failed_count ?? 0
  const newCount = previousCount + 1

  if (newCount === 1) {
    const paymentFailedAt = sub?.payment_failed_at ?? new Date().toISOString()
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        payment_failed_count: newCount,
        payment_failed_at: paymentFailedAt,
      })
      .eq('user_id', userId)

    if (error) {
      paymentLog.error('payment.mark_failed_error', { userId, message: error.message })
    }

    // Leading indicator of involuntary churn — a rising count here means cards
    // are failing before people actively cancel.
    paymentLog.warn('payment.failed', {
      userId,
      invoiceId: invoice.id,
      failedCount: newCount,
      inGracePeriod: true,
      amountDue: (invoice.amount_due ?? 0) / 100,
    })

    await syncCreditsForUser(userId)
    sendPaymentFailedNoticeAsync(userId, periodEnd)
    return
  }

  const forcedLockAt = new Date(Date.now() - PAYMENT_GRACE_PERIOD_MS - 1000).toISOString()
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      payment_failed_count: newCount,
      payment_failed_at: forcedLockAt,
    })
    .eq('user_id', userId)

  if (error) {
    console.error('Failed to force payment lock', userId, error.message)
  }

  await syncCreditsForUser(userId)
  sendAccessLockedEmailAsync(userId, periodEnd)
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
    invoiceDescriptionFromInterval(intervalFromPriceId(linePriceId))

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
    paymentLog.error('invoice.record_failed', {
      invoiceId: invoice.id,
      userId: mapping.user_id,
      message: error.message,
    })
    throw error
  }

  // Money actually received. Renewals are the revenue signal that first-time
  // checkouts don't show: counting these per user over time is how you see
  // whether people stay past the intro cycle.
  paymentLog.info('invoice.paid', {
    invoiceId: invoice.id,
    userId: mapping.user_id,
    amount: (invoice.amount_paid ?? 0) / 100,
    discountAmount: discountCents / 100,
    couponLabel,
    currency: invoice.currency ?? 'usd',
    interval: intervalFromPriceId(linePriceId),
    status: invoice.status ?? null,
  })

  // Clear the payment-failure grace flags ONLY when the subscription is actually
  // back in a paying state. Previously this cleared unconditionally on any paid
  // invoice — so an unrelated paid invoice (a proration, a one-off) arriving while
  // the subscription was still `past_due` would null payment_failed_at and, because
  // isWithinPaymentGracePeriod(null)===true, re-grant indefinite premium to a
  // non-paying user. A subscription that has truly recovered emits
  // customer.subscription.updated with status active/trialing, which clears the
  // flags via upsertSubscriptionFromStripe; we mirror that condition here.
  const { data: subRow } = await supabaseAdmin
    .from('subscriptions')
    .select('status')
    .eq('user_id', mapping.user_id)
    .maybeSingle()

  if (subRow?.status === 'active' || subRow?.status === 'trialing') {
    await supabaseAdmin
      .from('subscriptions')
      .update({ payment_failed_at: null, payment_failed_count: 0 })
      .eq('user_id', mapping.user_id)
  }

  await syncCreditsForUser(mapping.user_id)
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
 * Syncs AI chat credits to match the user's current content-access tier.
 */
export async function syncCreditsForUser(userId: string): Promise<void> {
  const grantsAccess = await hasAccess(userId)
  const targetBalance = grantsAccess ? PREMIUM_CREDIT_BALANCE : FREE_CREDIT_BALANCE

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

/**
 * After a subscription state change, sync the AI chat credit balance to match
 * the user's tier (respects the 24h payment-failure grace window).
 */
export async function syncCreditsForSubscription(
  sub: Stripe.Subscription
): Promise<void> {
  const userId = sub.metadata?.user_id
  if (!userId) return
  await syncCreditsForUser(userId)
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

/**
 * Atomically claims a Stripe event for processing.
 *
 * Inserts the event id (the table PK) and reports whether THIS caller won the
 * insert. Stripe delivers at-least-once and can deliver the same event
 * concurrently (or retry while a slow handler is still running); a read-then-write
 * guard lets two concurrent deliveries both pass and run side effects twice. The
 * PK unique constraint makes the insert the single source of truth: exactly one
 * caller gets `claimed: true`, every duplicate gets `claimed: false` and must NOT
 * dispatch. A genuine DB error (not a duplicate) is surfaced so the webhook can
 * 500 and let Stripe retry later.
 */
export async function claimEvent(
  eventId: string,
  type: string
): Promise<{ claimed: boolean }> {
  const { error } = await supabaseAdmin
    .from('stripe_events')
    .insert({ id: eventId, type })

  if (!error) return { claimed: true }

  // Postgres unique_violation → already claimed/processed by another delivery.
  if (error.code === '23505') return { claimed: false }

  // Any other error is a real failure; let the caller decide (return 500 → retry).
  throw new Error(`claimEvent failed: ${error.message}`)
}

/**
 * Releases a previously-claimed event so a Stripe retry can re-process it.
 * Called when dispatch throws after the claim succeeded.
 */
export async function releaseEventClaim(eventId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('stripe_events')
    .delete()
    .eq('id', eventId)
  if (error) {
    console.error('[stripe] releaseEventClaim failed', eventId, error.message)
  }
}
