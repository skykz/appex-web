import type { Request, Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from '../../types/index.js'
import { supabaseAdmin } from '../../db/supabase.js'
import { env } from '../../config/env.js'
import { AppError } from '../../utils/error-handler.js'
import { getStripe } from '../../lib/stripe.js'
import {
  createCheckoutSession as createCheckoutSessionSvc,
  createPortalSession as createPortalSessionSvc,
  introCouponIdForInterval,
  resolvePriceId,
  syncCreditsForSubscription,
  upsertSubscriptionFromStripe,
  userEligibleForIntroCoupon,
  type BillingInterval,
} from '../../services/stripe.service.js'
import { CANCEL_DEADLINE_MS } from '../../services/subscription-billing.constants.js'
import { sendCancellationConfirmedAsync } from '../../services/lifecycle-email.service.js'

const BILLING_INTERVALS: BillingInterval[] = ['week_1', 'week_4', 'year']

/** Returns the user's row from `users` (email + name) — needed for Stripe customer creation. */
async function getUserProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('email, name')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw new AppError(500, error.message)
  if (!data) throw new AppError(404, 'User not found')
  return data as { email: string; name: string | null }
}

/** Public — no auth. Lists configured plans so marketing and settings UI can render pricing. */
export async function listPlans(_req: Request, res: Response, next: NextFunction) {
  try {
    if (!env.stripeEnabled) {
      throw new AppError(503, 'Stripe is not configured')
    }
    const stripe = getStripe()
    const planDefs: Array<{
      id: BillingInterval
      priceId: string | undefined
      interval_label: string
    }> = [
      { id: 'week_1', priceId: env.STRIPE_PRICE_1WEEK, interval_label: 'week' },
      { id: 'week_4', priceId: env.STRIPE_PRICE_4WEEK, interval_label: '4 weeks' },
      { id: 'year', priceId: env.STRIPE_PRICE_YEARLY, interval_label: 'year' },
    ]

    const configured = planDefs.filter((p) => p.priceId)
    const prices = await Promise.all(
      configured.map((p) =>
        stripe.prices.retrieve(p.priceId!, { expand: ['product'] })
      )
    )

    const plans = await Promise.all(
      configured.map(async (def, i) => {
        const price = prices[i]
        const introCents = await computeIntroAmountCents(price, def.id)
        return {
          id: def.id,
          stripe_price_id: price.id,
          amount: (price.unit_amount ?? 0) / 100,
          intro_amount: introCents != null ? introCents / 100 : null,
          currency: price.currency,
          interval_label: def.interval_label,
        }
      })
    )

    res.json(plans)
  } catch (err) {
    next(err)
  }
}

/** Compute intro price by applying the plan's intro coupon to the renewal price. */
async function computeIntroAmountCents(
  price: import('stripe').Stripe.Price,
  interval: BillingInterval
): Promise<number | null> {
  const couponId = introCouponIdForInterval(interval)
  if (!couponId || !price.unit_amount) return null
  try {
    const stripe = getStripe()
    const coupon = await stripe.coupons.retrieve(couponId)
    if (coupon.amount_off) return Math.max(0, price.unit_amount - coupon.amount_off)
    if (coupon.percent_off) return Math.round(price.unit_amount * (1 - coupon.percent_off / 100))
    return null
  } catch {
    return null
  }
}

/** Returns the subscription row for the current user (or `null` if none). */
export async function getSubscription(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw new AppError(500, error.message)
    res.json(data ?? null)
  } catch (err) {
    next(err)
  }
}

/** Creates a Stripe Checkout Session and returns its URL for client-side redirect. */
export async function createCheckout(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId, userEmail } = req as AuthenticatedRequest
    const interval = req.body?.interval as BillingInterval | undefined
    if (!interval || !BILLING_INTERVALS.includes(interval)) {
      throw new AppError(400, 'interval must be "week_1", "week_4", or "year"')
    }

    if (interval === 'week_1' && !env.STRIPE_PRICE_1WEEK) {
      throw new AppError(503, '1-week plan is not configured')
    }

    // Block double-subscribing: if the user already has an active sub, send them to the portal instead.
    const { data: existing } = await supabaseAdmin
      .from('subscriptions')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle()
    if (
      existing &&
      ['active', 'trialing', 'past_due', 'paused'].includes(existing.status)
    ) {
      throw new AppError(
        409,
        'You already have a subscription. Use the billing portal to change plans.'
      )
    }

    const profile = await getUserProfile(userId)
    const applyIntro = await userEligibleForIntroCoupon(userId)
    const url = await createCheckoutSessionSvc({
      userId,
      userEmail: profile.email ?? userEmail,
      userName: profile.name ?? undefined,
      interval,
      applyIntro,
    })
    res.json({ url })
  } catch (err) {
    next(err)
  }
}

/**
 * Synchronous fallback for the success-redirect race: the browser is back on
 * /settings?checkout=success&session_id=cs_… BEFORE the webhook landed.
 * We retrieve the Checkout Session from Stripe, expand the subscription, and
 * upsert it into our DB right now. Idempotent with the webhook — if it already
 * processed this subscription, the upsert just rewrites identical fields.
 */
export async function syncFromSession(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    const sessionId = req.body?.session_id
    if (!sessionId || typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) {
      throw new AppError(400, 'session_id must be a Stripe Checkout Session id (cs_...)')
    }

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })

    // Verify the session belongs to the calling user. We set metadata.user_id
    // when creating the session — refuse if it doesn't match, otherwise an
    // attacker with a known session id could write to someone else's row.
    const sessionUserId = session.metadata?.user_id
    if (sessionUserId && sessionUserId !== userId) {
      throw new AppError(403, 'Session does not belong to the authenticated user')
    }

    if (session.mode !== 'subscription' || !session.subscription) {
      // Not a subscription checkout or no sub yet (e.g. async payment pending);
      // just return success so the UI can still invalidate its query.
      res.json({ synced: false })
      return
    }

    const sub =
      typeof session.subscription === 'string'
        ? await stripe.subscriptions.retrieve(session.subscription)
        : session.subscription
    await upsertSubscriptionFromStripe(sub)
    // Mirror the webhook side-effects so the UI doesn't have to wait for the
    // webhook to bump credits before the chat works.
    await syncCreditsForSubscription(sub)
    res.json({ synced: true, status: sub.status })
  } catch (err) {
    next(err)
  }
}

/** Creates a Stripe Customer Portal session and returns its URL. */
export async function createPortal(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId, userEmail } = req as AuthenticatedRequest
    const profile = await getUserProfile(userId)
    const url = await createPortalSessionSvc(
      userId,
      profile.email ?? userEmail,
      profile.name ?? undefined
    )
    res.json({ url })
  } catch (err) {
    next(err)
  }
}

/** Loads the user's current Stripe subscription id from our DB (or 404s). */
async function getUserStripeSubId(userId: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('stripe_subscription_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new AppError(500, error.message)
  if (!data?.stripe_subscription_id) {
    throw new AppError(404, 'No active subscription')
  }
  return data.stripe_subscription_id
}

/** Pauses collection on the subscription (Stripe keeps the sub active but stops billing). */
export async function pauseSubscription(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    const subId = await getUserStripeSubId(userId)
    const stripe = getStripe()
    const updated = await stripe.subscriptions.update(subId, {
      pause_collection: { behavior: 'void' },
    })
    await upsertSubscriptionFromStripe(updated)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

/** Lifts the pause set by `pauseSubscription` so billing resumes on the next cycle. */
export async function resumeSubscription(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    const subId = await getUserStripeSubId(userId)
    const stripe = getStripe()
    const updated = await stripe.subscriptions.update(subId, {
      pause_collection: '',
    })
    await upsertSubscriptionFromStripe(updated)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

/**
 * Cancels the subscription at the end of the current period — access stays
 * until current_period_end and Stripe shows `cancel_at_period_end=true`.
 */
export async function cancelSubscription(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest

    const { data: localSub, error: localErr } = await supabaseAdmin
      .from('subscriptions')
      .select('current_period_end')
      .eq('user_id', userId)
      .maybeSingle()

    if (localErr) throw new AppError(500, localErr.message)

    if (localSub?.current_period_end) {
      const periodEndMs = new Date(localSub.current_period_end).getTime()
      if (periodEndMs - Date.now() < CANCEL_DEADLINE_MS) {
        throw new AppError(
          409,
          'Cancellation must be requested at least 24 hours before your renewal date.'
        )
      }
    }

    const subId = await getUserStripeSubId(userId)
    const stripe = getStripe()
    const updated = await stripe.subscriptions.update(subId, {
      cancel_at_period_end: true,
    })
    await upsertSubscriptionFromStripe(updated)

    const accessUntil = localSub?.current_period_end ?? null
    if (accessUntil) {
      sendCancellationConfirmedAsync(userId, accessUntil)
    }

    res.json({ success: true, access_until: accessUntil })
  } catch (err) {
    next(err)
  }
}

/** Undoes a scheduled cancellation. */
export async function reactivateSubscription(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    const subId = await getUserStripeSubId(userId)
    const stripe = getStripe()
    const updated = await stripe.subscriptions.update(subId, {
      cancel_at_period_end: false,
    })
    await upsertSubscriptionFromStripe(updated)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

/**
 * Win-back flow: swap the current subscription's price to the yearly plan
 * with prorations. Used by the "Don't lose your savings — switch to yearly" UI
 * shown in the cancel modal.
 */
export async function switchToYearly(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    const subId = await getUserStripeSubId(userId)
    const stripe = getStripe()
    const current = await stripe.subscriptions.retrieve(subId)
    const itemId = current.items.data[0]?.id
    if (!itemId) throw new AppError(500, 'Subscription has no line items')

    const updated = await stripe.subscriptions.update(subId, {
      cancel_at_period_end: false,
      items: [{ id: itemId, price: resolvePriceId('year') }],
      proration_behavior: 'create_prorations',
    })
    await upsertSubscriptionFromStripe(updated)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

/** Reads billing_history for the current user, newest first. */
export async function getBillingHistory(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    const { data, error } = await supabaseAdmin
      .from('billing_history')
      .select('*')
      .eq('user_id', userId)
      .order('paid_at', { ascending: false })
    if (error) throw new AppError(500, error.message)
    res.json(data ?? [])
  } catch (err) {
    next(err)
  }
}
