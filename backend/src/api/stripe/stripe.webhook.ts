import type { Request, Response } from 'express'
import type Stripe from 'stripe'
import { env } from '../../config/env.js'
import { getStripe } from '../../lib/stripe.js'
import {
  claimEvent,
  releaseEventClaim,
  markPaymentFailedFromInvoice,
  recordInvoicePayment,
  syncCreditsForSubscription,
  upsertSubscriptionFromStripe,
} from '../../services/stripe.service.js'
import {
  isLandingCheckoutSession,
  provisionFromLandingCheckoutSession,
} from '../../services/landing-checkout-provision.service.js'
import { sendPaymentConfirmedAsync } from '../../services/lifecycle-email.service.js'

/**
 * Stripe webhook entry point.
 *
 * IMPORTANT: mounted with `express.raw({ type: 'application/json' })` in app.ts —
 * `req.body` here is a Buffer, not parsed JSON, so signature verification works.
 *
 * Idempotency is enforced by atomically CLAIMING the event (insert into
 * `stripe_events`, gated by the PK) BEFORE dispatch. A duplicate or concurrent
 * delivery loses the claim and returns 200 without re-running side effects. If
 * dispatch fails, we release the claim and return 500 so Stripe retries.
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

  // Atomically claim the event before doing any work. Only the caller that wins
  // the insert proceeds; duplicates/concurrent deliveries short-circuit here.
  let claimed: boolean
  try {
    ;({ claimed } = await claimEvent(event.id, event.type))
  } catch (err) {
    // Real DB error (not a duplicate) → let Stripe retry.
    console.error(`Stripe webhook claim failed (${event.type})`, err)
    res.status(500).send('Webhook claim error')
    return
  }

  if (!claimed) {
    res.json({ received: true, duplicate: true })
    return
  }

  try {
    await dispatch(event)
    res.json({ received: true })
  } catch (err) {
    // Release the claim so a future Stripe retry can re-attempt the handler;
    // otherwise the event id would be permanently marked done with no work done.
    console.error(`Stripe webhook handler error (${event.type})`, err)
    await releaseEventClaim(event.id)
    res.status(500).send('Webhook handler error')
  }
}

async function dispatch(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    // Checkout finished. The subscription object on the session is the
    // freshly-created one; we re-retrieve to get the latest state including
    // any discounts/proration that Stripe applied server-side.
    // `async_payment_succeeded` covers delayed payment methods, where
    // `completed` arrives while the session is still unpaid and the money lands
    // later. Both funnel through the same paid-only provisioning below.
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'subscription' || !session.subscription) return
      // Only grant access / report a conversion once the money is actually in.
      // Delayed methods fire `completed` with payment_status 'unpaid'; acting on
      // that would provision a free account and send Meta a fake Purchase.
      if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
        console.info(
          `[stripe] checkout session ${session.id} not paid yet (payment_status=${session.payment_status}); waiting for async_payment_succeeded`
        )
        return
      }
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
      const invoice = event.data.object as Stripe.Invoice
      await recordInvoicePayment(invoice)
      sendPaymentConfirmedAsync(invoice)
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
