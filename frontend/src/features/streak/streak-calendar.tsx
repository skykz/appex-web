import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@shared/lib'

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

interface StreakCalendarProps {
  /** Set of ISO date strings (YYYY-MM-DD) that count as active streak days */
  activeDays: Set<string>
  /** Displayed month in `YYYY-MM` form, aligned with `GET /streaks/calendar?month=` */
  monthKey: string
  /** Called when the learner moves to another month so the parent can refetch active days */
  onMonthKeyChange: (monthKey: string) => void
}

function toDateKey(year: number, monthIndex0: number, day: number) {
  return `${year}-${String(monthIndex0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseMonthKey(monthKey: string): { year: number; monthIndex0: number } | null {
  const [y, m] = monthKey.split('-').map(Number)
  if (!y || !m || m < 1 || m > 12) return null
  return { year: y, monthIndex0: m - 1 }
}

/**
 * Month grid for streak check-ins; month navigation is controlled by the parent for API-backed days.
 */
export function StreakCalendar({
  activeDays,
  monthKey,
  onMonthKeyChange,
}: StreakCalendarProps) {
  const parsed = parseMonthKey(monthKey)
  const today = new Date()
  const todayKey = toDateKey(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  )

  if (!parsed) {
    return (
      <div className="rounded-xl border border-orange-100 bg-white p-4 text-sm text-zinc-500">
        Invalid month
      </div>
    )
  }

  const { year, monthIndex0 } = parsed
  const firstDayOfMonth = new Date(year, monthIndex0, 1).getDay()
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate()

  function prevMonth() {
    const d = new Date(year, monthIndex0 - 1, 1)
    onMonthKeyChange(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    )
  }

  function nextMonth() {
    const d = new Date(year, monthIndex0 + 1, 1)
    onMonthKeyChange(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    )
  }

  const monthLabel = new Date(year, monthIndex0, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-4 sm:p-5">
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="flex size-8 items-center justify-center rounded-full text-zinc-500 transition-colors duration-200 hover:bg-white hover:text-zinc-900 active:scale-90"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-5" />
        </button>
        <span className="text-sm font-bold text-zinc-900">{monthLabel}</span>
        <button
          type="button"
          onClick={nextMonth}
          className="flex size-8 items-center justify-center rounded-full text-zinc-500 transition-colors duration-200 hover:bg-white hover:text-zinc-900 active:scale-90"
          aria-label="Next month"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="mb-3 grid grid-cols-7 text-center">
        {DAY_LABELS.map((d) => (
          <span key={d} className="text-xs font-semibold text-zinc-500">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-2.5">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} />
          }

          const dateKey = toDateKey(year, monthIndex0, day)
          const isActive = activeDays.has(dateKey)
          const isToday = dateKey === todayKey

          return (
            <div key={dateKey} className="flex items-center justify-center">
              <div
                className={cn(
                  'flex size-10 items-center justify-center rounded-full text-sm transition-all duration-200',
                  isActive
                    ? 'bg-orange-500 font-semibold text-white shadow-sm'
                    : 'bg-white text-zinc-500 shadow-sm ring-1 ring-orange-100/80',
                  isToday &&
                    !isActive &&
                    'font-semibold text-zinc-900 ring-2 ring-orange-400/70'
                )}
              >
                {day}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
