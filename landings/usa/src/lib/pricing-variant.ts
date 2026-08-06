import { getAnonId } from './attribution'
import {
  PRICING_VARIANTS,
  DEFAULT_PRICING_VARIANT,
  type PricingVariant,
} from './paywall-plans'

/**
 * Assigns the visitor a pricing A/B arm and keeps it stable.
 *
 * STICKY BY DEVICE, NOT BY VISIT. The arm is derived from a hash of the
 * visitor's `anon_id`, so a reload, a return trip, or bouncing between the quiz
 * and the paywall always lands on the same shelf. Re-rolling would show someone
 * a $0.99 card, then a $6.93 one — which reads as a bait-and-switch and makes
 * the experiment unmeasurable.
 *
 * Derived rather than stored: nothing to migrate, nothing to expire, and an arm
 * can't drift if storage is cleared mid-funnel.
 */

/**
 * Holds ONLY a manual `?pricing=` preview, never a real assignment. Kept apart
 * from the hash so previewing an arm can't pin a device into it.
 */
const OVERRIDE_KEY = 'appexPricingOverride'

/** All arm names, in a fixed order so the hash maps to the same arm every time. */
const ARMS = Object.keys(PRICING_VARIANTS) as PricingVariant[]

/**
 * FNV-1a. Small, dependency-free, and well distributed over short ASCII strings
 * like a UUID — the browser has no built-in synchronous hash (SubtleCrypto is
 * async, and this is read during render).
 */
function hash(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * The visitor's arm.
 *
 * An explicit `?pricing=` in the URL always wins — that's how the team previews
 * an arm on demand and how QA reproduces a report. Otherwise the arm is hashed
 * from anon_id. Salted with a fixed experiment name so a visitor's arm here is
 * independent of their arm in any other test keyed off the same id.
 */
export function getPricingVariant(): PricingVariant {
  if (typeof window === 'undefined') return DEFAULT_PRICING_VARIANT

  try {
    // Preview override, kept in its OWN key and never mixed into the assignment
    // below. Both used to share one key, which meant a single QA preview pinned
    // that device to the previewed arm — and since sessionStorage is per-tab
    // while anon_id is per-device, the same person could be shown a $0.99 card
    // in one tab and a $6.93 card in another.
    const forced = new URLSearchParams(window.location.search).get('pricing')
    if (forced && forced in PRICING_VARIANTS) {
      const arm = forced as PricingVariant
      // Persist so the override survives the SPA navigation to /paywall, which
      // drops the query string.
      try {
        sessionStorage.setItem(OVERRIDE_KEY, arm)
      } catch {
        /* storage disabled — the URL still holds for this page */
      }
      return arm
    }
    const overridden = sessionStorage.getItem(OVERRIDE_KEY)
    if (overridden && overridden in PRICING_VARIANTS) return overridden as PricingVariant

    // Real assignment. Derived purely from anon_id (localStorage, per device), so
    // it is identical in every tab and on every return visit with nothing stored
    // that could drift out of sync.
    const anon = getAnonId()
    if (!anon) return DEFAULT_PRICING_VARIANT
    return ARMS[hash(`pricing_v1:${anon}`) % ARMS.length]
  } catch {
    return DEFAULT_PRICING_VARIANT
  }
}
