import { describe, it, expect } from 'vitest'
import { planIndexToId } from './landing-api'
import { PAYWALL_PLANS, PAYWALL_DEFAULT_INDEX, VISIBLE_PAYWALL_PLANS } from './paywall-plans'

/**
 * These guard a money bug: `planIndexToId` turns the user's card selection into
 * the plan id that is actually charged. It used to map hardcoded positions
 * (0 → week_1, 2 → year, else week_4), so inserting or reordering a plan sold the
 * WRONG one — the user picks the cheapest card and gets billed for the annual.
 *
 * The property that matters is "index N always resolves to the plan sitting at
 * index N", asserted against the array itself so it keeps holding as plans are
 * added for the 1-day/A-B work.
 */
describe('planIndexToId', () => {
  it('resolves every index to the plan actually at that position', () => {
    PAYWALL_PLANS.forEach((plan, index) => {
      expect(planIndexToId(index)).toBe(plan.id)
    })
  })

  it('resolves the indices carried by VISIBLE_PAYWALL_PLANS', () => {
    // The picker renders from VISIBLE_PAYWALL_PLANS but selects by the paired
    // original index — the exact path a real purchase takes.
    for (const { plan, index } of VISIBLE_PAYWALL_PLANS) {
      expect(planIndexToId(index)).toBe(plan.id)
    }
  })

  it('falls back to the default plan for an out-of-range index', () => {
    const fallback = PAYWALL_PLANS[PAYWALL_DEFAULT_INDEX].id
    expect(planIndexToId(-1)).toBe(fallback)
    expect(planIndexToId(999)).toBe(fallback)
    expect(planIndexToId(PAYWALL_PLANS.length)).toBe(fallback)
  })

  it('returns a distinct id per plan (no two cards sell the same plan)', () => {
    const ids = PAYWALL_PLANS.map((_, i) => planIndexToId(i))
    expect(new Set(ids).size).toBe(PAYWALL_PLANS.length)
  })
})
