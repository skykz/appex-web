import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Entry plans ("1 Day", "1 Week") must be sold on the 4-WEEK price.
 *
 * Their intro coupons are fixed amounts sized against $38.95: a "1 Week"
 * checkout created on the $17.77/week price instead has that coupon wipe the
 * first payment to $0.00 and then renews WEEKLY at $17.77 (~$77/month) rather
 * than $38.95 every 4 weeks — silently, with nothing erroring, and
 * contradicting the renewal terms the customer agreed to on the paywall.
 *
 * This regressed once already: the landing checkout had the 4-week override
 * inlined while the SPA checkout path called resolvePriceId directly. The two
 * paths now share resolveCheckoutPriceId, and this test pins the behaviour so
 * a third caller cannot quietly reintroduce the split.
 */

const PRICE_1WEEK = 'price_test_1week_17_77'
const PRICE_4WEEK = 'price_test_4week_38_95'
const PRICE_12WEEK = 'price_test_12week'
const PRICE_YEARLY = 'price_test_yearly'

async function loadService() {
  vi.resetModules()
  process.env.STRIPE_PRICE_1WEEK = PRICE_1WEEK
  process.env.STRIPE_PRICE_4WEEK = PRICE_4WEEK
  process.env.STRIPE_PRICE_12WEEK = PRICE_12WEEK
  process.env.STRIPE_PRICE_YEARLY = PRICE_YEARLY
  return import('./stripe.service.js')
}

const ORIGINAL = { ...process.env }

afterEach(() => {
  process.env = { ...ORIGINAL }
  vi.resetModules()
})

describe('resolveCheckoutPriceId', () => {
  it('creates entry plans (day_1, week_1) on the 4-week price', async () => {
    const { resolveCheckoutPriceId } = await loadService()
    for (const interval of ['day_1', 'week_1'] as const) {
      const r = resolveCheckoutPriceId(interval)
      expect(r.priceId, `${interval} must bill on the 4-week price`).toBe(PRICE_4WEEK)
      expect(r.isEntryOn4WeekPrice).toBe(true)
    }
  })

  it('never bills week_1 on the weekly price', async () => {
    const { resolveCheckoutPriceId } = await loadService()
    expect(resolveCheckoutPriceId('week_1').priceId).not.toBe(PRICE_1WEEK)
  })

  it('leaves real cadences on their own price', async () => {
    const { resolveCheckoutPriceId } = await loadService()
    for (const [interval, expected] of [
      ['week_4', PRICE_4WEEK],
      ['week_12', PRICE_12WEEK],
      ['year', PRICE_YEARLY],
    ] as const) {
      const r = resolveCheckoutPriceId(interval)
      expect(r.priceId, interval).toBe(expected)
      expect(r.isEntryOn4WeekPrice, interval).toBe(false)
    }
  })

  it('falls back to the plan price when the 4-week price is unset', async () => {
    vi.resetModules()
    process.env.STRIPE_PRICE_1WEEK = PRICE_1WEEK
    delete process.env.STRIPE_PRICE_4WEEK
    process.env.STRIPE_PRICE_YEARLY = PRICE_YEARLY
    const { resolveCheckoutPriceId } = await import('./stripe.service.js')
    // A misconfigured 4-week price must not take the whole entry plan down.
    const r = resolveCheckoutPriceId('week_1')
    expect(r.priceId).toBe(PRICE_1WEEK)
    expect(r.isEntryOn4WeekPrice).toBe(false)
  })

  it('resolvePriceId still reports each plan’s own price', async () => {
    const { resolvePriceId } = await loadService()
    // The distinction the fix rests on: resolvePriceId answers "which price
    // represents this plan", resolveCheckoutPriceId "which price does a new
    // subscription get created on".
    expect(resolvePriceId('week_1')).toBe(PRICE_1WEEK)
    expect(resolvePriceId('day_1')).toBe(PRICE_4WEEK)
  })
})
