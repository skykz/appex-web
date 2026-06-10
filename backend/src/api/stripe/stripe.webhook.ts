import type { Request, Response } from 'express'
import type Stripe from 'stripe'
import { env } from '../../config/env.js'
import { getStripe } from '../../lib/stripe.js'
import {
  isEventProcessed,
  markEventProcessed,
  markPaymentFailedFromInvoice,
  recordInvoicePayment,
  syncCreditsForSubscription,
  upsertSubscriptionFromStripe,
} from '../../services/stripe.service.js'
import {
  isLandingCheckoutSession,
  provisionFromLandingCheckoutSession,
} from '../../services/landing-checkout-provision.service.js'

/**
 * Stripe webhook entry point.
 *
 * IMPORTANT: mounted with `express.raw({ type: 'application/json' })` in app.ts —
 * `req.body` here is a Buffer, not parsed JSON, so signature verification works.
 *
 * We always return 200 quickly after acknowledging the event; failures inside
 * handlers are logged but do not surface to Stripe as 5xx (which would trigger
 * retries that compound the problem). Idempotency is enforced via `stripe_events`.
 */
export async function stripeWebhookHandler(req: Request, res: Response) {
  if (!env.stripeEnabled || !env.STRIPE_WEBHOOK_SECRET) {
    res.status(503).send('Stripe not configured')
    return
  }

  const signature = req.headers['stripe-signature']
  if (!signature) {
    res.status(400).send('Missing stripe-signature header')
    return
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(
      req.body as Buffer,
      signature as string,
      env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    console.error('Stripe webhook signature verification failed:', msg)
    res.status(400).send(`Webhook signature verification failed: ${msg}`)
    return
  }

  // Idempotency: Stripe retries on non-2xx, and at-least-once delivery is
  // documented behaviour. Skip events we've already handled.
  if (await isEventProcessed(event.id)) {
    res.json({ received: true, duplicate: true })
    return
  }

  try {
    await dispatch(event)
    await markEventProcessed(event.id, event.type)
    res.json({ received: true })
  } catch (err) {
    // Log loudly but still 200: the event is in `stripe_events`-less state, so
    // a future retry from Stripe will re-attempt the handler.
    console.error(`Stripe webhook handler error (${event.type})`, err)
    res.status(500).send('Webhook handler error')
  }
}

async function dispatch(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    // Checkout finished. The subscription object on the session is the
    // freshly-created one; we re-retrieve to get the latest state including
    // any discounts/proration that Stripe applied server-side.
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'subscription' || !session.subscription) return
      const stripe = getStripe()
      const sub = await stripe.subscriptions.retrieve(
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription.id
      )

      if (session.metadata?.user_id) {
        await upsertSubscriptionFromStripe(sub)
        await syncCreditsForSubscription(sub)
        return
      }

      if (isLandingCheckoutSession(session)) {
        await provisionFromLandingCheckoutSession(session, sub)
        return
      }

      await upsertSubscriptionFromStripe(sub)
      await syncCreditsForSubscription(sub)
      return
    }

    // Full lifecycle of the subscription — all funnel into the same upsert
    // and credit sync. Credits flip back to free on `deleted` (sub.status is
    // 'canceled' on that event) so cancellation cleanly revokes the bump.
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'customer.subscription.paused':
    case 'customer.subscription.resumed':
    case 'customer.subscription.trial_will_end': {
      const sub = event.data.object as Stripe.Subscription
      await upsertSubscriptionFromStripe(sub)
      await syncCreditsForSubscription(sub)
      return
    }

    // Payment-related events: write to billing_history.
    case 'invoice.paid':
    case 'invoice.payment_succeeded': {
      await recordInvoicePayment(event.data.object as Stripe.Invoice)
      return
    }

    // Payment failed — start the 24h grace window and sync credits when it ends.
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      await markPaymentFailedFromInvoice(invoice)
      return
    }

    default:
      // Stripe sends a lot of events; ignore the ones we don't care about.
      return
  }
}
