import { describe, expect, it } from 'vitest'
import { planNameFromInterval, invoiceDescriptionFromInterval } from './stripe.service.js'
import { planDisplayLabel } from './email-templates/layout.js'

/**
 * Every billing interval the paywall can sell. Kept as a literal list rather than
 * imported so that ADDING an interval to the code without teaching these
 * label/description functions about it shows up as a failing test rather than as
 * a customer receiving an email that calls their plan "Premium".
 */
const ALL_INTERVALS = ['day_1', 'week_1', 'week_4', 'week_12', 'year'] as const

describe('plan labels cover every sellable interval', () => {
  it('planNameFromInterval never falls through to the generic default', () => {
    for (const interval of ALL_INTERVALS) {
      expect(planNameFromInterval(interval)).not.toBe('Premium subscription')
    }
  })

  it('invoiceDescriptionFromInterval never falls through', () => {
    for (const interval of ALL_INTERVALS) {
      expect(invoiceDescriptionFromInterval(interval)).not.toBe('Subscription plan')
    }
  })

  it('planDisplayLabel (emails) never falls back for a sellable interval', () => {
    for (const interval of ALL_INTERVALS) {
      expect(planDisplayLabel(interval)).not.toBe('Premium')
    }
  })

  it('names the new plans specifically', () => {
    expect(planNameFromInterval('week_12')).toBe('12-week subscription')
    expect(planDisplayLabel('week_12')).toBe('12 Weeks')
    // day_1 bills on the 4-week cadence, so that is what the customer is on by
    // the time any receipt reaches them.
    expect(planDisplayLabel('day_1')).toBe('4 Weeks')
  })

  it('still falls back for an unknown/absent interval', () => {
    expect(planNameFromInterval(null)).toBe('Premium subscription')
    expect(planDisplayLabel(null)).toBe('Premium')
    expect(planDisplayLabel(undefined)).toBe('Premium')
  })
})
