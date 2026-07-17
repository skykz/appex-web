import crypto from 'node:crypto'
import { env } from '../config/env.js'

/**
 * Meta Conversions API (server-side) event sender for the ads funnel.
 *
 * The browser fires InitiateCheckout with a shared `event_id`; the reliable
 * money event — Purchase — is sent from here on confirmed Stripe payment, using
 * the SAME `event_id` + `_fbp` / `_fbc` so Meta deduplicates browser vs. server.
 *
 * Config-driven and safe by default: with `META_PIXEL_ID` /
 * `META_CAPI_ACCESS_TOKEN` unset, `sendPurchaseEvent` is a no-op — payment
 * provisioning is never blocked by tracking.
 */

const GRAPH_API_VERSION = 'v21.0'

/** SHA-256 lowercase-hex of a normalized value, as Meta requires for PII fields. */
function hash(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

export type PurchaseEventInput = {
  /** Shared with the browser InitiateCheckout event_id for deduplication. */
  eventId?: string | null
  email: string
  value: number
  currency: string
  /** Plan interval id (week_1 | week_4 | year) — sent as content id/name. */
  plan?: string | null
  /** Meta browser cookies captured on the landing at checkout time. */
  fbp?: string | null
  fbc?: string | null
  /** Creative/UTM attribution for Purchase reporting (which ad drove the sale). */
  variant?: string | null
  utmSource?: string | null
  utmCampaign?: string | null
  /** Best-effort event source URL (the landing origin). */
  eventSourceUrl?: string | null
  /** Client IP / UA improve match quality; optional. */
  clientIpAddress?: string | null
  clientUserAgent?: string | null
}

/**
 * Sends a Purchase event to the Meta Conversions API. Never throws — logs and
 * returns false on any failure so it can be safely fire-and-forget'd from the
 * Stripe webhook. Returns false immediately when CAPI is not configured.
 */
export async function sendPurchaseEvent(input: PurchaseEventInput): Promise<boolean> {
  if (!env.metaCapiEnabled) return false

  const userData: Record<string, unknown> = {
    em: [hash(input.email)],
  }
  if (input.fbp) userData.fbp = input.fbp
  if (input.fbc) userData.fbc = input.fbc
  if (input.clientIpAddress) userData.client_ip_address = input.clientIpAddress
  if (input.clientUserAgent) userData.client_user_agent = input.clientUserAgent

  const customData: Record<string, unknown> = {
    value: input.value,
    currency: input.currency,
  }
  if (input.plan) {
    customData.content_type = 'product'
    customData.content_ids = [input.plan]
    customData.content_name = `Appex ${input.plan}`
  }
  // Creative/UTM attribution — surfaces the winning ad in Meta's breakdowns.
  if (input.variant) customData.variant = input.variant
  if (input.utmSource) customData.utm_source = input.utmSource
  if (input.utmCampaign) customData.utm_campaign = input.utmCampaign

  const event: Record<string, unknown> = {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    user_data: userData,
    custom_data: customData,
  }
  if (input.eventId) event.event_id = input.eventId
  if (input.eventSourceUrl) event.event_source_url = input.eventSourceUrl

  const body: Record<string, unknown> = { data: [event] }
  if (env.META_TEST_EVENT_CODE) body.test_event_code = env.META_TEST_EVENT_CODE

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${env.META_PIXEL_ID}/events?access_token=${encodeURIComponent(
    env.META_CAPI_ACCESS_TOKEN as string
  )}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.warn('[meta-capi] Purchase event rejected', res.status, text.slice(0, 500))
      return false
    }

    return true
  } catch (err) {
    console.warn('[meta-capi] Purchase event error', err)
    return false
  }
}

/**
 * Fire-and-forget wrapper: sends the Purchase event without awaiting, so payment
 * provisioning latency is unaffected. Errors are swallowed inside sendPurchaseEvent.
 */
export function sendPurchaseEventAsync(input: PurchaseEventInput): void {
  void sendPurchaseEvent(input)
}
