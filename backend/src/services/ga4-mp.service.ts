import { env } from '../config/env.js'

/**
 * GA4 Measurement Protocol (server-side) purchase sender for the ads funnel.
 *
 * Runs IN PARALLEL to the Meta Conversions API (`meta-capi.service.ts`) as a
 * second server-side conversion stream. Fired on confirmed Stripe payment,
 * reusing the browser GA4 `client_id` so the server `purchase` attributes to the
 * same user/session as the browser `begin_checkout`.
 *
 * Config-driven and safe by default: with `GA4_MEASUREMENT_ID` / `GA4_API_SECRET`
 * unset, `sendPurchaseEvent` is a no-op. It also no-ops without a `client_id`,
 * which GA4 requires to attribute an event. Never throws — payment provisioning
 * is never blocked by tracking.
 *
 * GA4 dedups repeated `purchase` events by `transaction_id`, so we pass the
 * Stripe checkout session id as the transaction id.
 */

export type Ga4PurchaseInput = {
  /** GA4 client id captured in the browser; required for attribution. */
  clientId?: string | null
  /** Stripe checkout session id — used as GA4 transaction_id (dedup key). */
  transactionId: string
  value: number
  currency: string
  /** Plan interval id (week_1 | week_4 | year) — sent as the line item. */
  plan?: string | null
  /** Creative/UTM attribution for reporting (which ad drove the sale). */
  variant?: string | null
  utmSource?: string | null
  utmCampaign?: string | null
  /** Google Ads click id — links this server conversion to the ad click. */
  gclid?: string | null
}

/**
 * Sends a `purchase` event to the GA4 Measurement Protocol. Never throws — logs
 * and returns false on any failure so it can be safely fire-and-forget'd. Returns
 * false immediately when GA4 MP is not configured or no client_id is available.
 */
export async function sendPurchaseEvent(input: Ga4PurchaseInput): Promise<boolean> {
  if (!env.ga4MpEnabled) return false
  if (!input.clientId) {
    // Without a client_id GA4 cannot attribute the event to a user/session, and
    // would count it as a brand-new anonymous user — skip rather than pollute.
    console.warn('[ga4-mp] purchase skipped — no client_id for session', input.transactionId)
    return false
  }

  const params: Record<string, unknown> = {
    currency: input.currency,
    value: input.value,
    transaction_id: input.transactionId,
  }
  if (input.plan) {
    params.items = [{ item_id: input.plan, item_name: `Appex ${input.plan}` }]
  }
  if (input.variant) params.variant = input.variant
  if (input.utmSource) params.utm_source = input.utmSource
  if (input.utmCampaign) params.utm_campaign = input.utmCampaign
  if (input.gclid) params.gclid = input.gclid

  const body = {
    client_id: input.clientId,
    events: [{ name: 'purchase', params }],
  }

  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(
    env.GA4_MEASUREMENT_ID as string
  )}&api_secret=${encodeURIComponent(env.GA4_API_SECRET as string)}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    // GA4 MP returns 204 on success and, notably, 2xx even for invalid events
    // (it does not validate in the production endpoint). Only network/5xx fail here.
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.warn('[ga4-mp] purchase rejected', res.status, text.slice(0, 300))
      return false
    }

    return true
  } catch (err) {
    console.warn('[ga4-mp] purchase error', err)
    return false
  }
}

/**
 * Fire-and-forget wrapper: sends the GA4 purchase without awaiting, so payment
 * provisioning latency is unaffected. Errors are swallowed inside sendPurchaseEvent.
 */
export function sendPurchaseEventAsync(input: Ga4PurchaseInput): void {
  void sendPurchaseEvent(input)
}
