import { env } from '../config/env.js'
import { supabaseAdmin } from '../db/supabase.js'
import { sendEmail } from './email.service.js'

/**
 * Billing failures that need a human to fix a live subscription in Stripe.
 *
 * `week1_conversion_failed` — the "1 Week" plan's two-phase schedule could not
 * be attached after checkout, so the subscription is still on the WEEKLY price.
 * Left alone the customer is charged the full weekly price every week instead of
 * the advertised 4-week price. Must be fixed by hand in Stripe.
 */
export type BillingAlertType = 'week1_conversion_failed'

export interface BillingAlertInput {
  type: BillingAlertType
  /** Human-readable failure detail — typically the Stripe error message. */
  detail: string
  email?: string | null
  userId?: string | null
  stripeSubscriptionId?: string | null
  stripeCustomerId?: string | null
  stripeCheckoutSessionId?: string | null
  /** Extra structured context stored as jsonb (price ids, amounts, tier…). */
  context?: Record<string, unknown>
}

/** Subject line + lead paragraph per alert type. */
const ALERT_COPY: Record<BillingAlertType, { subject: string; lead: string }> = {
  week1_conversion_failed: {
    subject: '[Appex] URGENT: 1-Week plan stuck on weekly billing',
    lead:
      'A "1 Week" subscription was paid but could NOT be converted to the 4-week ' +
      'price. As it stands this customer will be charged the full weekly price ' +
      'every week instead of $38.95 every 4 weeks — this contradicts the ' +
      'disclosure they agreed to. Fix the subscription in Stripe manually.',
  },
}

/** Escapes a value for safe interpolation into the alert email HTML. */
function escapeHtml(value: unknown): string {
  return String(value ?? '—')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Renders the ops email body for an alert. */
function renderAlertEmail(input: BillingAlertInput): { html: string; text: string } {
  const { lead } = ALERT_COPY[input.type]
  const rows: Array<[string, unknown]> = [
    ['Alert', input.type],
    ['Customer email', input.email],
    ['Subscription', input.stripeSubscriptionId],
    ['Customer', input.stripeCustomerId],
    ['Checkout session', input.stripeCheckoutSessionId],
    ['User id', input.userId],
    ['Detail', input.detail],
  ]

  const html = `<p><strong>${escapeHtml(lead)}</strong></p><table>${rows
    .map(
      ([label, value]) =>
        `<tr><td><strong>${escapeHtml(label)}</strong></td><td>${escapeHtml(value)}</td></tr>`
    )
    .join('')}</table>`

  const text = `${lead}\n\n${rows.map(([l, v]) => `${l}: ${v ?? '—'}`).join('\n')}`
  return { html, text }
}

/**
 * Records a billing alert and emails ops about it.
 *
 * Never throws. Callers are on the Stripe-webhook happy path (provisioning a
 * paying customer), so a failure to *report* a problem must not itself break
 * provisioning — worst case the alert degrades to a console error.
 *
 * The DB row is the durable record: `billing_alerts` has a unique index on
 * (alert_type, stripe_subscription_id) for unresolved rows, so a webhook
 * re-delivery can't spam duplicates. Email is best-effort on top, and is only
 * sent when the row was newly inserted — that way a replay doesn't re-notify.
 */
export async function raiseBillingAlert(input: BillingAlertInput): Promise<void> {
  const { type, detail } = input

  // Always log: this is the last line of defence if both the insert and the
  // email fail (e.g. migration not applied yet, Mailgun down).
  console.error(
    `[billing-alert] ${type}`,
    JSON.stringify({
      email: input.email ?? null,
      subscription: input.stripeSubscriptionId ?? null,
      detail,
    })
  )

  try {
    const { error } = await supabaseAdmin.from('billing_alerts').insert({
      alert_type: type,
      user_id: input.userId ?? null,
      email: input.email ?? null,
      stripe_subscription_id: input.stripeSubscriptionId ?? null,
      stripe_customer_id: input.stripeCustomerId ?? null,
      stripe_checkout_session_id: input.stripeCheckoutSessionId ?? null,
      detail,
      context: input.context ?? {},
    })

    if (error) {
      // 23505 = unique violation: an unresolved alert for this subscription and
      // type already exists, so this is a re-delivery. Not a failure — but skip
      // the email so ops isn't notified twice for one broken subscription.
      if (error.code === '23505') {
        console.info(`[billing-alert] ${type} already open for ${input.stripeSubscriptionId}`)
        return
      }
      console.error(`[billing-alert] failed to persist ${type}: ${error.message}`)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    console.error(`[billing-alert] failed to persist ${type}: ${msg}`)
  }

  const to = env.BILLING_ALERT_EMAIL
  if (!to) {
    console.warn('[billing-alert] BILLING_ALERT_EMAIL not set — alert not emailed')
    return
  }
  // Reaching here means this alert is either newly recorded or failed to
  // persist — the duplicate (re-delivery) case already returned above. Both
  // remaining cases warrant the email; an un-persisted alert especially so,
  // since then the email is the only signal ops will ever get.
  try {
    const { html, text } = renderAlertEmail(input)
    await sendEmail({
      to,
      subject: ALERT_COPY[type].subject,
      html,
      text,
      tag: 'billing-alert',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    console.error(`[billing-alert] failed to email ${type}: ${msg}`)
  }
}
