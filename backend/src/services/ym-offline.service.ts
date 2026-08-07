import { env } from '../config/env.js'

/**
 * Yandex Metrica offline-conversions sender for the ads funnel.
 *
 * The third server-side conversion stream, running alongside the Meta
 * Conversions API (`meta-capi.service.ts`) and the GA4 Measurement Protocol
 * (`ga4-mp.service.ts`). Fired on confirmed Stripe payment.
 *
 * Config-driven and safe by default: with `YM_COUNTER_ID` / `YM_OFFLINE_TOKEN`
 * unset, every export here is a no-op. Never throws — payment provisioning is
 * never blocked by tracking.
 *
 * ── Why this exists, given the browser already fires a `purchase` goal ──
 * The browser goal is lost whenever an ad blocker strips the Metrica tag, the
 * buyer closes the tab on the Stripe redirect, or the success page returns in a
 * context where the tag never initialises. Those are exactly the sales you least
 * want missing from bid optimisation. This upload is Stripe-verified and
 * therefore authoritative.
 *
 * ── Dedup: read this before reporting on the data ──
 * Unlike GA4 (which merges browser and server `purchase` by `transaction_id`),
 * Metrica does NOT merge a browser goal with an offline conversion. So this
 * service uploads a DIFFERENTLY-NAMED goal:
 *
 *   purchase            — browser goal, realtime, lossy
 *   purchase_confirmed  — this upload, authoritative, Stripe-verified
 *
 * Report revenue and optimise Yandex.Direct on `purchase_confirmed`. Summing the
 * two double-counts every sale that managed to fire both.
 *
 * ── Identity ──
 * A conversion attaches by ClientID (Metrica's own visitor id, captured in the
 * browser at checkout) or by `yclid` (the Direct click id). We prefer `yclid`
 * when present: it ties the sale directly to a Direct click, which is what the
 * bidding actually consumes. Without either, Metrica cannot attach the row at
 * all, so we skip rather than upload an orphan.
 */

/** Goal id uploaded by this service. See the dedup note in the module docstring. */
export const YM_OFFLINE_GOAL = 'purchase_confirmed'

export type YmOfflineConversionInput = {
  /** Metrica ClientID captured in the browser; used when no yclid is available. */
  clientId?: string | null
  /** Yandex.Direct click id — preferred identifier when present. */
  yclid?: string | null
  /** Stripe checkout session id — carried as the conversion's order id. */
  transactionId: string
  value: number
  currency: string
  /** Epoch ms of the purchase; defaults to now. */
  purchasedAt?: number
}

/** Metrica requires a 10-digit UNIX timestamp (seconds), not milliseconds. */
function toUnixSeconds(ms: number): number {
  return Math.floor(ms / 1000)
}

/**
 * Escapes a CSV field: the upload endpoint takes CSV, and an unescaped comma or
 * quote in a value would shift every following column silently.
 */
function csvField(value: string | number): string {
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Uploads one purchase as an offline conversion. Never throws — logs and returns
 * false on any failure so it can be safely fire-and-forget'd. Returns false
 * immediately when not configured or when no usable identifier is available.
 */
export async function sendOfflineConversion(
  input: YmOfflineConversionInput
): Promise<boolean> {
  if (!env.ymOfflineEnabled) return false

  // `yclid` first: it attributes the sale to a specific Direct click, which is
  // what Direct's bidding reads. ClientID only ties it to a Metrica visitor.
  const useYclid = Boolean(input.yclid)
  const identifier = input.yclid || input.clientId
  if (!identifier) {
    console.warn(
      '[ym-offline] conversion skipped — no yclid or ClientID for session',
      input.transactionId
    )
    return false
  }

  const idColumn = useYclid ? 'Yclid' : 'ClientId'
  const header = `${idColumn},Target,DateTime,Price,Currency`
  const row = [
    csvField(identifier),
    csvField(YM_OFFLINE_GOAL),
    csvField(toUnixSeconds(input.purchasedAt ?? Date.now())),
    csvField(input.value),
    csvField(input.currency.toUpperCase()),
  ].join(',')
  const csv = `${header}\n${row}\n`

  const url =
    `https://api-metrika.yandex.net/management/v1/counter/${encodeURIComponent(
      env.YM_COUNTER_ID as string
    )}/offline_conversions/upload?client_id_type=${useYclid ? 'YCLID' : 'CLIENT_ID'}`

  try {
    // multipart/form-data with the CSV as a `file` part — the shape this
    // endpoint expects. A plain CSV body is rejected with 400.
    const form = new FormData()
    form.append('file', new Blob([csv], { type: 'text/csv' }), 'conversions.csv')

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `OAuth ${env.YM_OFFLINE_TOKEN as string}`,
      },
      body: form,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.warn('[ym-offline] conversion rejected', res.status, text.slice(0, 300))
      return false
    }

    return true
  } catch (err) {
    console.warn('[ym-offline] conversion error', err)
    return false
  }
}

/**
 * Fire-and-forget wrapper: uploads without awaiting, so payment provisioning
 * latency is unaffected. Errors are swallowed inside sendOfflineConversion.
 */
export function sendOfflineConversionAsync(input: YmOfflineConversionInput): void {
  void sendOfflineConversion(input)
}
