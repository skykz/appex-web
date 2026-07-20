/**
 * Google Tag Manager dataLayer bridge for the USA funnel.
 *
 * GTM (container GTM-NH866XS4) is installed in index.html purely as a CONTAINER
 * so the marketing team can attach their OWN tags (Google Ads conversions,
 * remarketing, etc.) without a code deploy. GA4 and the Meta Pixel are still sent
 * directly from our code (ga4.ts / meta-pixel.ts) — they are NOT configured in
 * GTM, so nothing double-counts.
 *
 * What this module does: mirror each funnel event into `window.dataLayer` so the
 * marketer can use them as GTM triggers (e.g. fire a Google Ads "purchase"
 * conversion on our `purchase` dataLayer event). It only pushes data — it never
 * loads GA4/Pixel. Safe no-op if the dataLayer isn't present.
 *
 * IMPORTANT for whoever configures GTM: trigger your tags off these events, but
 * do NOT add a GA4 Configuration/Event tag or a Meta Pixel tag in GTM — those
 * are already sent by the app and would duplicate every conversion.
 */

declare global {
  interface Window {
    dataLayer?: unknown[]
  }
}

/**
 * Pushes a funnel event + params onto the GTM dataLayer. Never throws; no-op when
 * the dataLayer isn't available (GTM blocked / not yet loaded — GTM creates the
 * array itself, and pushes made before it loads are replayed on load).
 */
export function pushToDataLayer(event: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  try {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({ event, ...(params ?? {}) })
  } catch {
    /* analytics must never break the funnel */
  }
}
