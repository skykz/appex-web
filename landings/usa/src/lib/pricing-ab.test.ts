import { describe, it, expect } from 'vitest'
import { visiblePlansFor, usesPerDayLayout } from './paywall-plans'
import { planIndexToId } from './landing-api'

describe('A/B arm → checkout plan id', () => {
  it('every card in every arm resolves to its own plan id', () => {
    for (const v of ['control', 'day_entry'] as const) {
      for (const { plan, index } of visiblePlansFor(v)) {
        expect(planIndexToId(index)).toBe(plan.id)
      }
    }
  })

  it('picking the 1 Day card in day_entry sells day_1 (not week_1)', () => {
    const shelf = visiblePlansFor('day_entry')
    const dayCard = shelf.find(({ plan }) => plan.label === '1 Day')!
    expect(dayCard.index).toBe(0)
    expect(planIndexToId(dayCard.index)).toBe('day_1')
  })

  it('control never offers day_1; day_entry never offers week_1', () => {
    expect(visiblePlansFor('control').map(r => r.plan.id)).not.toContain('day_1')
    expect(visiblePlansFor('day_entry').map(r => r.plan.id)).not.toContain('week_1')
  })

  it('both arms offer the same number of cards and include the default', () => {
    const c = visiblePlansFor('control'), d = visiblePlansFor('day_entry')
    // Card counts deliberately DIFFER: control is the paywall exactly as it
    // ships today (no 12-week plan), so the test compares the whole new paywall
    // against the real baseline rather than against a hybrid no visitor has seen.
    // That makes this a package test — a win says "the new paywall is better",
    // not which of the three changes did the work.
    expect(c.length).toBe(3)
    expect(d.length).toBe(4)
    // What must hold in both: the same default plan, so the comparison isn't
    // confounded by a different card being pre-selected.
    for (const shelf of [c, d]) expect(shelf.map(r => r.plan.id)).toContain('week_4')
  })

  it('control is the current production shelf; only day_entry gets the new plans', () => {
    const control = visiblePlansFor('control').map(r => r.plan.id)
    const dayEntry = visiblePlansFor('day_entry').map(r => r.plan.id)

    expect(control).toEqual(['week_1', 'week_4', 'year'])
    expect(control).not.toContain('week_12')
    expect(control).not.toContain('day_1')

    expect(dayEntry).toContain('day_1')
    expect(dayEntry).toContain('week_12')
  })

  it('only the new arm uses the per-day card layout', () => {
    expect(usesPerDayLayout('control')).toBe(false)
    expect(usesPerDayLayout('day_entry')).toBe(true)
  })
})
