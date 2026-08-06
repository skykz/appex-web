import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { resolveRange } from './date-ranges'

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
})
