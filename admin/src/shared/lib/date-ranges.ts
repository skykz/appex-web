/**
 * Date ranges for the analytics filters, shared by the funnel and experiments
 * pages so the two can't drift into offering different periods.
 *
 * Boundaries are LOCAL to the admin's browser, not UTC. Someone asking for
 * "today" means their today; a UTC day boundary would show them a window that
 * starts mid-afternoon and quietly omits the morning they're asking about.
 */

export type RangeKey = 'today' | 'yesterday' | 'week' | '7' | '30' | '90'

export interface DateRange {
  from: string
  /**
   * Upper bound, omitted for open-ended ranges.
   *
   * Left undefined for anything ending "now" so the backend applies its own
   * slightly-in-the-future default — it exists to absorb clock skew against
   * Postgres, and pinning `to` to this machine's clock would defeat it and drop
   * the newest events. Only closed ranges (yesterday) set it.
   */
  to?: string
}

export const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This week' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
]

/** Local midnight at the start of the day `offset` days from today. */
function startOfDay(offset = 0): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  return d
}

/**
 * Resolves a range key to the `from`/`to` the API expects.
 *
 * "This week" starts Monday — the business week these funnels are read against,
 * and what a European admin means by the phrase. `getDay()` is 0 for Sunday, so
 * Sunday maps back six days rather than forward one.
 */
export function resolveRange(key: RangeKey): DateRange {
  switch (key) {
    case 'today':
      return { from: startOfDay().toISOString() }

    case 'yesterday':
      // The only closed range: it ends at today's midnight, so late events
      // can't leak in and change a number that should now be final.
      return {
        from: startOfDay(-1).toISOString(),
        to: startOfDay().toISOString(),
      }

    case 'week': {
      const today = startOfDay()
      const weekday = today.getDay()
      return { from: startOfDay(-(weekday === 0 ? 6 : weekday - 1)).toISOString() }
    }

    default: {
      const days = Number(key)
      return { from: startOfDay(-(days - 1)).toISOString() }
    }
  }
}
