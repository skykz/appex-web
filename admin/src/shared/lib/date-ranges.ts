/**
 * Date ranges for the analytics filters, shared by the funnel and experiments
 * pages so the two can't drift into offering different periods.
 *
 * Boundaries are LOCAL to the admin's browser, not UTC. Someone asking for
 * "today" means their today; a UTC day boundary would show them a window that
 * starts mid-afternoon and quietly omits the morning they're asking about.
 */

export type RangeKey = 'today' | 'yesterday' | 'week' | '7' | '30' | '90' | 'custom'

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
  { value: 'custom', label: 'Custom range…' },
]

/**
 * A custom range, as the two `yyyy-mm-dd` strings an `<input type="date">` holds.
 *
 * Kept as calendar dates rather than timestamps because that is what the picker
 * speaks and what the admin means: "3rd to 5th" is three whole local days, not
 * an instant-to-instant span.
 */
export interface CustomRange {
  /** Inclusive first day. */
  from: string
  /** Inclusive LAST day — resolveRange converts it to the following midnight. */
  to: string
}

/** `yyyy-mm-dd` for a Date, in LOCAL time — `toISOString` would shift the day. */
export function toDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Today as `yyyy-mm-dd`, for the picker's `max` so future days can't be picked. */
export function todayInput(): string {
  return toDateInput(new Date())
}

/**
 * Parses `yyyy-mm-dd` into LOCAL midnight.
 *
 * `new Date("2026-08-03")` parses as UTC midnight, which in a positive-offset
 * timezone is still the 2nd locally — every custom range would silently start a
 * day early. Splitting the parts and using the Date(y, m, d) constructor keeps
 * it local, matching startOfDay above.
 */
function parseDateInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return null
  const [, y, mo, d] = m
  const date = new Date(Number(y), Number(mo) - 1, Number(d))
  date.setHours(0, 0, 0, 0)
  // Rejects impossible dates like 2026-02-31, which the constructor would
  // silently roll forward into March.
  if (date.getMonth() !== Number(mo) - 1 || date.getDate() !== Number(d)) return null
  return Number.isNaN(date.getTime()) ? null : date
}

/** True when both ends parse and `from` is not after `to`. */
export function isValidCustomRange(custom?: CustomRange): boolean {
  if (!custom) return false
  const from = parseDateInput(custom.from)
  const to = parseDateInput(custom.to)
  return Boolean(from && to && from.getTime() <= to.getTime())
}

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
export function resolveRange(key: RangeKey, custom?: CustomRange): DateRange {
  switch (key) {
    case 'custom': {
      // Falls back to the 30-day default rather than throwing: the page renders
      // while the admin is still half-way through picking dates, and a blank or
      // reversed range must not blow up the report.
      if (!isValidCustomRange(custom)) return resolveRange('30')
      const from = parseDateInput(custom!.from)!
      const to = parseDateInput(custom!.to)!
      // `to` is the day AFTER the last selected one. The picker names whole
      // days, and the API bound is `created_at <= to`, so ending at the last
      // day's own midnight would include only its first instant and silently
      // drop 24 hours — the single-day case would return nothing at all.
      to.setDate(to.getDate() + 1)
      return { from: from.toISOString(), to: to.toISOString() }
    }

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
      // Guarded rather than trusting the type: `key` reaches here from a
      // `<select>` value via an unchecked `as RangeKey`, so a stale persisted
      // value — or a new preset added to the union without a case above —
      // arrives as a non-numeric string. `Number(...)` would be NaN, and
      // `new Date(NaN).toISOString()` THROWS, blanking the whole page for what
      // should be a harmless bad filter.
      const days = Number(key)
      if (!Number.isFinite(days) || days < 1) return { from: startOfDay(-29).toISOString() }
      return { from: startOfDay(-(days - 1)).toISOString() }
    }
  }
}
