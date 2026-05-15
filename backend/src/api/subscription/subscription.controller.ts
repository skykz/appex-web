import type { Request, Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from '../../types/index.js'
import { supabaseAdmin } from '../../db/supabase.js'
import { env } from '../../config/env.js'
import { AppError } from '../../utils/error-handler.js'
import { getStripe } from '../../lib/stripe.js'
import {
  createCheckoutSession as createCheckoutSessionSvc,
  createPortalSession as createPortalSessionSvc,
  resolvePriceId,
  upsertSubscriptionFromStripe,
} from '../../services/stripe.service.js'

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

/** Public — no auth. Lists the two available plans so the marketing UI can render them. */
export async function listPlans(_req: Request, res: Response, next: NextFunction) {
  try {
    if (!env.stripeEnabled) {
      throw new AppError(503, 'Stripe is not configured')
    }
    const stripe = getStripe()
    const [fourWeek, yearly] = await Promise.all([
      stripe.prices.retrieve(env.STRIPE_PRICE_4WEEK!, { expand: ['product'] }),
      stripe.prices.retrieve(env.STRIPE_PRICE_YEARLY!, { expand: ['product'] }),
    ])

    const introCents = env.STRIPE_INTRO_COUPON_ID
      ? await computeIntroAmountCents(fourWeek)
      : null

    res.json([
      {
        id: 'week_4',
        stripe_price_id: fourWeek.id,
        amount: (fourWeek.unit_amount ?? 0) / 100,
        intro_amount: introCents != null ? introCents / 100 : null,
        currency: fourWeek.currency,
        interval_label: '4 weeks',
      },
      {
        id: 'year',
        stripe_price_id: yearly.id,
        amount: (yearly.unit_amount ?? 0) / 100,
        intro_amount: null,
        currency: yearly.currency,
        interval_label: 'year',
      },
    ])
  } catch (err) {
    next(err)
  }
}

/** Compute intro price by applying the configured coupon to the base price. */
async function computeIntroAmountCents(price: import('stripe').Stripe.Price): Promise<number | null> {
  if (!env.STRIPE_INTRO_COUPON_ID || !price.unit_amount) return null
  try {
    const stripe = getStripe()
    const coupon = await stripe.coupons.retrieve(env.STRIPE_INTRO_COUPON_ID)
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
    const interval = req.body?.interval as 'week_4' | 'year' | undefined
    if (interval !== 'week_4' && interval !== 'year') {
      throw new AppError(400, 'interval must be "week_4" or "year"')
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
    const url = await createCheckoutSessionSvc({
      userId,
      userEmail: profile.email ?? userEmail,
      userName: profile.name ?? undefined,
      interval,
      // Intro applies only to the 4-week plan and only on the first subscription.
      applyIntro: interval === 'week_4',
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
    const subId = await getUserStripeSubId(userId)
    const stripe = getStripe()
    const updated = await stripe.subscriptions.update(subId, {
      cancel_at_period_end: true,
    })
    await upsertSubscriptionFromStripe(updated)
    res.json({ success: true })
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
