import { useEffect, useState } from 'react'
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

  /**
   * What the inputs display, which is NOT what the report is queried with.
   *
   * A native date input emits `change` on every edited segment, so typing
   * "01/15/2026" walks through 2026-01-01 and 2026-08-01 before landing on the
   * intended day. Bound straight to the parent, each of those is a complete,
   * VALID range — so the page fires a query per keystroke and briefly renders a
   * report for a window nobody asked for. Held locally and lifted only once the
   * value is a usable date (see commit below).
   */
  const [draft, setDraft] = useState(custom)

  // Re-sync when the parent changes the range from outside (preset switch,
  // reset). Keyed on the values, so local edits — which the parent echoes back
  // identically — don't clobber what is being typed.
  useEffect(() => setDraft(custom), [custom.from, custom.to])

  /**
   * Lifts an edit to the parent only when it is a complete, in-range date.
   *
   * A partial value ("2026-08-" mid-edit, or an empty field) stays local, so the
   * displayed report keeps showing the last window the admin actually chose
   * rather than flickering through the 30-day fallback.
   */
  const commit = (next: CustomRange) => {
    setDraft(next)
    if (isValidCustomRange(next)) onCustomChange(next)
  }

  // Only flagged once BOTH ends are filled: warning about a reversed range while
  // the admin is still typing the first date is noise, not help.
  const incomplete = isCustom && Boolean(draft.from) && Boolean(draft.to) &&
    !isValidCustomRange(draft)
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
              value={draft.from}
              // NOT bounded by `draft.to`: a native input silently refuses a
              // typed value outside min/max, so capping `from` at the current
              // `to` makes widening a range backwards impossible to type. The
              // reversed case is caught by the warning below instead.
              max={max}
              onChange={(e) => commit({ ...draft, from: e.target.value })}
              aria-label="From date"
              className="h-10 rounded-md border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span className="text-sm text-muted-foreground">→</span>
            <input
              type="date"
              value={draft.to}
              max={max}
              onChange={(e) => commit({ ...draft, to: e.target.value })}
              aria-label="To date"
              className="h-10 rounded-md border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        )}
      </div>

      {incomplete && (
        <p className="text-xs text-amber-700">
          Start date is after the end date — still showing the previous range.
        </p>
      )}
    </div>
  )
}
