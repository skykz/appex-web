import { describe, it, expect } from 'vitest'
import { visiblePlansFor } from './paywall-plans'
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
    expect(c.length).toBe(d.length)
    for (const shelf of [c, d]) expect(shelf.map(r => r.plan.id)).toContain('week_4')
  })
})
