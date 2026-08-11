import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { resolveRange, isValidCustomRange, toDateInput, todayInput } from './date-ranges'

/**
 * Boundary tests, because the failure mode here is silent: an off-by-one in a
 * day boundary produces a plausible-looking number that is simply for the wrong
 * window, and nothing on the page would reveal it.
 */

/** Wednesday 2026-08-05, mid-afternoon local time. */
const WEDNESDAY = new Date(2026, 7, 5, 15, 30, 0)

function localMidnight(y: number, m: number, d: number): string {
  return new Date(y, m, d, 0, 0, 0, 0).toISOString()
}

describe('resolveRange', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(WEDNESDAY)
  })
  afterEach(() => vi.useRealTimers())

  it('today starts at local midnight and stays open-ended', () => {
    const r = resolveRange('today')
    expect(r.from).toBe(localMidnight(2026, 7, 5))
    // Open-ended on purpose — the backend's future-skewed default upper bound
    // is what keeps the newest events from being dropped.
    expect(r.to).toBeUndefined()
  })

  it('yesterday is a closed range ending at todays midnight', () => {
    const r = resolveRange('yesterday')
    expect(r.from).toBe(localMidnight(2026, 7, 4))
    expect(r.to).toBe(localMidnight(2026, 7, 5))
  })

  it('this week starts Monday', () => {
    // Wednesday the 5th → Monday the 3rd.
    expect(resolveRange('week').from).toBe(localMidnight(2026, 7, 3))
  })

  it('treats Sunday as the END of the week, not the start', () => {
    // The getDay()===0 case: a naive `day - 1` would send Sunday forward a day
    // and report a week that hasn't happened.
    vi.setSystemTime(new Date(2026, 7, 9, 10, 0, 0)) // Sunday 2026-08-09
    expect(resolveRange('week').from).toBe(localMidnight(2026, 7, 3))
  })

  it('day ranges are inclusive of today', () => {
    // "Last 7 days" = today plus the 6 before it, not 168 hours back.
    expect(resolveRange('7').from).toBe(localMidnight(2026, 6, 30))
    expect(resolveRange('30').from).toBe(localMidnight(2026, 6, 7))
  })

  it('crosses a month boundary correctly', () => {
    vi.setSystemTime(new Date(2026, 7, 2, 9, 0, 0)) // Sunday 2026-08-02
    expect(resolveRange('yesterday').from).toBe(localMidnight(2026, 7, 1))
    expect(resolveRange('7').from).toBe(localMidnight(2026, 6, 27)) // back into July
  })

  // ── Custom range ─────────────────────────────────────────────────────────

  it('spans whole local days, ending at the midnight AFTER the last one', () => {
    // The API bound is `created_at <= to`. Ending at the last day's own midnight
    // would include only its first instant and silently drop 24 hours.
    const r = resolveRange('custom', { from: '2026-08-03', to: '2026-08-05' })
    expect(r.from).toBe(localMidnight(2026, 7, 3))
    expect(r.to).toBe(localMidnight(2026, 7, 6))
  })

  it('covers a full 24 hours when one day is picked for both ends', () => {
    // The single-day case is the one an off-by-one breaks hardest: it would
    // return an empty report rather than an obviously wrong one.
    const r = resolveRange('custom', { from: '2026-08-04', to: '2026-08-04' })
    expect(r.from).toBe(localMidnight(2026, 7, 4))
    expect(r.to).toBe(localMidnight(2026, 7, 5))
  })

  it('parses the picker value as LOCAL midnight, not UTC', () => {
    // `new Date("2026-08-03")` is UTC midnight — still the 2nd in any
    // positive-offset timezone, so every custom range would start a day early.
    expect(resolveRange('custom', { from: '2026-08-03', to: '2026-08-03' }).from)
      .toBe(localMidnight(2026, 7, 3))
  })

  it('handles a custom range crossing a year boundary', () => {
    const r = resolveRange('custom', { from: '2025-12-30', to: '2026-01-02' })
    expect(r.from).toBe(localMidnight(2025, 11, 30))
    expect(r.to).toBe(localMidnight(2026, 0, 3))
  })

  it('falls back to the 30-day default when the range is unusable', () => {
    // The page renders while the admin is still mid-pick; a half-filled or
    // reversed range must not blow up or silently query nothing.
    const fallback = resolveRange('30')
    for (const bad of [
      undefined,
      { from: '', to: '' },
      { from: '2026-08-05', to: '2026-08-03' }, // reversed
      { from: 'nonsense', to: '2026-08-03' },
      { from: '2026-02-31', to: '2026-03-01' }, // impossible day
    ]) {
      expect(resolveRange('custom', bad as never)).toEqual(fallback)
    }
  })

  it('validates ranges, allowing from === to', () => {
    expect(isValidCustomRange({ from: '2026-08-03', to: '2026-08-05' })).toBe(true)
    expect(isValidCustomRange({ from: '2026-08-03', to: '2026-08-03' })).toBe(true)
    expect(isValidCustomRange({ from: '2026-08-05', to: '2026-08-03' })).toBe(false)
    expect(isValidCustomRange({ from: '2026-02-31', to: '2026-03-01' })).toBe(false)
    expect(isValidCustomRange(undefined)).toBe(false)
  })

  it('never throws on a key outside the union', () => {
    // `key` arrives from a <select> via an unchecked `as RangeKey`, so a stale
    // persisted value or a newly-added preset without a case reaches `default:`.
    // Number(...) is NaN there, and new Date(NaN).toISOString() THROWS — which
    // would blank the entire page over a bad filter.
    for (const bad of ['bogus', '', 'NaN', '0', '-5', 'Infinity']) {
      expect(() => resolveRange(bad as never)).not.toThrow()
      const r = resolveRange(bad as never)
      expect(r.from).toBe(resolveRange('30').from)
    }
  })

  it('formats picker values in local time', () => {
    // Late evening is where a UTC-based formatter would report tomorrow.
    expect(toDateInput(new Date(2026, 7, 5, 23, 59))).toBe('2026-08-05')
    expect(toDateInput(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01')
    expect(todayInput()).toBe('2026-08-05')
  })
})
