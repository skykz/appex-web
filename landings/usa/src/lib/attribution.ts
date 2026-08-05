/**
 * First-touch attribution capture for the ads funnel.
 *
 * On the first landing hit we snapshot the creative/variant tag (`?v=`) plus all
 * UTM params and `fbclid` from the URL, and persist them for the whole session.
 * First-touch wins: once captured, later navigations (which drop the query
 * string as the SPA moves quiz → paywall → checkout) do NOT overwrite it.
 *
 * The captured `variant` is what lets AU managers compare creatives: point each
 * ad at `…/?v=hero_a` / `…/?v=hero_b&utm_campaign=…`, and the tag rides through
 * every Pixel/CAPI event, the quiz lead row, and Stripe metadata → so both Meta
 * and the DB attribute the Purchase back to the exact creative.
 */

const STORAGE_KEY = 'appexAttribution'

/**
 * Version of this landing build.
 *
 * Bump when the landing changes in a way that could move conversion, so cohorts
 * before and after stay comparable. An ad URL can override it with
 * `?landing_version=` to tag a specific campaign's build.
 */
export const LANDING_VERSION = 'v1'

export type Attribution = {
  /** Creative / page variant tag from `?v=` (e.g. "hero_a"). */
  variant?: string
  /**
   * Landing build the visitor entered on (`?landing_version=v5`).
   *
   * Separate from `quiz_version` on purpose: the landing and the quiz ship
   * independently, so one changing must not invalidate cohort comparisons for
   * the other. Jobescape carries both in every ad URL for the same reason.
   *
   * Defaults to LANDING_VERSION when the ad URL omits it, so organic traffic
   * still lands in a named cohort instead of an unattributable null bucket.
   */
  landing_version?: string
  utm_source?: string
  utm_campaign?: string
  utm_medium?: string
  utm_content?: string
  utm_term?: string
  /**
   * Ad-set and ad ids (`?utm_adset=` / `?utm_ad=`), carrying Meta's
   * `{{adset.id}}` / `{{ad.id}}`. These are the two levels below campaign that
   * plain UTMs don't have a slot for, and `ad.id` is the only value that
   * identifies the CREATIVE a purchase came from — utm_content historically held
   * `{{adset.name}}`, which is the ad set, not the ad, and a renamed set breaks
   * the join. Ids over names on purpose: an id survives a rename, a name doesn't.
   */
  utm_adset?: string
  utm_ad?: string
  /** Meta click id from `?fbclid=` (first touch). */
  fbclid?: string
  /** Epoch ms when fbclid was first captured — needed to synthesize `_fbc`. */
  fbclid_ts?: number
  /** Google Ads click id from `?gclid=` (first touch) — for Google Ads attribution. */
  gclid?: string
  /** Google Ads iOS/web-to-app click ids (`?wbraid=` / `?gbraid=`). */
  wbraid?: string
  gbraid?: string
}

/** Fields exported as flat string params (excludes the internal timestamp). */
const ATTR_KEYS: (keyof Attribution)[] = [
  'variant',
  'landing_version',
  'utm_source',
  'utm_campaign',
  'utm_medium',
  'utm_content',
  'utm_term',
  'utm_adset',
  'utm_ad',
  'fbclid',
  'gclid',
  'wbraid',
  'gbraid',
]

/** Reads a stored attribution snapshot, or null if none captured yet. */
function readStored(): Attribution | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Attribution) : null
  } catch {
    return null
  }
}

/** Extracts attribution fields from the current URL query string. */
function readFromUrl(): Attribution {
  const attr: Attribution = {}
  try {
    const params = new URLSearchParams(window.location.search)
    // `v` is the short creative/variant tag; also accept explicit `variant`.
    const variant = params.get('v') ?? params.get('variant') ?? undefined
    if (variant) attr.variant = variant.slice(0, 64)
    // Always set, falling back to the build's own version: a null here would
    // drop organic visitors out of every version-sliced report.
    attr.landing_version = (params.get('landing_version') ?? LANDING_VERSION).slice(0, 40)
    for (const key of ['utm_source', 'utm_campaign', 'utm_medium', 'utm_content', 'utm_term', 'utm_adset', 'utm_ad'] as const) {
      const val = params.get(key)
      if (val) attr[key] = val.slice(0, 200)
    }
    const fbclid = params.get('fbclid')
    if (fbclid) {
      attr.fbclid = fbclid.slice(0, 512)
      attr.fbclid_ts = Date.now()
    }
    // Google Ads click ids (gclid, or wbraid/gbraid for iOS/app campaigns).
    for (const key of ['gclid', 'wbraid', 'gbraid'] as const) {
      const val = params.get(key)
      if (val) attr[key] = val.slice(0, 512)
    }
  } catch {
    /* ignore malformed URL */
  }
  return attr
}

/**
 * Captures first-touch attribution once per session. Safe to call on every route
 * change; only the first call with URL params persists (first-touch wins).
 * Returns the effective (stored) attribution.
 */
export function captureAttribution(): Attribution {
  const stored = readStored()
  if (stored) return stored

  const fromUrl = readFromUrl()
  // Only persist if we actually saw something; otherwise a later hit that DOES
  // carry params can still become the first touch.
  if (Object.keys(fromUrl).length > 0) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fromUrl))
    } catch {
      /* storage disabled — fall through, non-fatal */
    }
    return fromUrl
  }
  return {}
}

/** Returns the current session's attribution (captures from URL if not yet stored). */
export function getAttribution(): Attribution {
  return readStored() ?? captureAttribution()
}

/**
 * Attribution as flat event/metadata params (drops empty fields). Used to stamp
 * Pixel events, the quiz lead payload, and Stripe/CAPI metadata consistently.
 */
export function getAttributionParams(): Partial<Record<keyof Attribution, string>> {
  const attr = getAttribution()
  const out: Partial<Record<keyof Attribution, string>> = {}
  for (const key of ATTR_KEYS) {
    const val = attr[key]
    if (val) out[key] = val
  }
  return out
}

const ANON_ID_KEY = 'appexAnonId'
const SESSION_ID_KEY = 'appexSessionId'

/** Generates a UUID (falls back to a timestamp-based id where crypto is unavailable). */
function newId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Persistent anonymous visitor id — survives across visits (localStorage). Used
 * to stitch a user's events together over time in the product analytics.
 */
export function getAnonId(): string {
  try {
    const existing = localStorage.getItem(ANON_ID_KEY)
    if (existing) return existing
    const id = newId('anon')
    localStorage.setItem(ANON_ID_KEY, id)
    return id
  } catch {
    return newId('anon')
  }
}

/** Per-visit session id (sessionStorage) — one funnel run through the quiz. */
export function getSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_ID_KEY)
    if (existing) return existing
    const id = newId('sess')
    sessionStorage.setItem(SESSION_ID_KEY, id)
    return id
  } catch {
    return newId('sess')
  }
}

/**
 * The standard param envelope stamped on EVERY analytics event: identity
 * (anon_id/session_id), a per-event timestamp, and first-touch attribution.
 * This is what `quiz_step`, `quiz_answer`, and all milestone events carry.
 */
export function getEventEnvelope(): Record<string, string | number> {
  return {
    anon_id: getAnonId(),
    session_id: getSessionId(),
    timestamp: Date.now(),
    ...getAttributionParams(),
  }
}
