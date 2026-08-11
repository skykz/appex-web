import {
  RANGE_OPTIONS,
  isValidCustomRange,
  todayInput,
  type CustomRange,
  type RangeKey,
} from '@shared/lib'
import { Select } from './select'

/**
 * Period selector for the analytics pages: the preset list, plus two date
 * inputs revealed when "Custom range…" is picked.
 *
 * Uses native `<input type="date">` rather than a calendar component. The admin
 * has no date-picker dependency, and the native control brings a real calendar,
 * keyboard entry, and locale-correct formatting for free — where a hand-rolled
 * popover would be a lot of surface area for one filter. The tradeoff is that
 * the popup is styled by the browser, not by us.
 *
 * Shared by both pages so the funnel and the experiment can't drift into
 * offering different periods — the two are read against each other.
 */
export function DateRangePicker({
  range,
  onRangeChange,
  custom,
  onCustomChange,
}: {
  range: RangeKey
  onRangeChange: (next: RangeKey) => void
  custom: CustomRange
  onCustomChange: (next: CustomRange) => void
}) {
  const isCustom = range === 'custom'
  // Only flagged once BOTH ends are filled: warning about a reversed range while
  // the admin is still typing the first date is noise, not help.
  const incomplete = isCustom && Boolean(custom.from) && Boolean(custom.to) &&
    !isValidCustomRange(custom)
  // Future days hold no events; offering them invites an empty report that
  // looks like a data problem.
  const max = todayInput()

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={range}
          onChange={(e) => onRangeChange(e.target.value as RangeKey)}
          aria-label="Date range"
        >
          {RANGE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>

        {isCustom && (
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={custom.from}
              max={custom.to || max}
              onChange={(e) => onCustomChange({ ...custom, from: e.target.value })}
              aria-label="From date"
              className="h-10 rounded-md border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span className="text-sm text-muted-foreground">→</span>
            <input
              type="date"
              value={custom.to}
              // Bounded by `from` as well as today, so the two inputs can't be
              // dragged into a reversed range in the first place.
              min={custom.from || undefined}
              max={max}
              onChange={(e) => onCustomChange({ ...custom, to: e.target.value })}
              aria-label="To date"
              className="h-10 rounded-md border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        )}
      </div>

      {incomplete && (
        <p className="text-xs text-amber-700">
          Start date is after the end date — showing the last 30 days until it's fixed.
        </p>
      )}
    </div>
  )
}
