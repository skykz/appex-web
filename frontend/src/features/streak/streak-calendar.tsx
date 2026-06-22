import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@shared/lib'

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

type SlideDirection = 'next' | 'prev'

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

function monthKeyFromDate(year: number, monthIndex0: number) {
  return `${year}-${String(monthIndex0 + 1).padStart(2, '0')}`
}

interface MonthGridProps {
  year: number
  monthIndex0: number
  activeDays: Set<string>
  todayKey: string
  slideDirection: SlideDirection
  animate: boolean
}

/**
 * Renders one month grid with a horizontal slide-in when the parent changes months.
 */
function MonthGrid({
  year,
  monthIndex0,
  activeDays,
  todayKey,
  slideDirection,
  animate,
}: MonthGridProps) {
  const firstDayOfMonth = new Date(year, monthIndex0, 1).getDay()
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate()
  const monthLabel = new Date(year, monthIndex0, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div
      key={`${year}-${monthIndex0}`}
      className={cn(
        animate &&
          (slideDirection === 'next'
            ? 'streak-cal-slide-next'
            : 'streak-cal-slide-prev'),
        'motion-reduce:animate-none'
      )}
      style={{
        animationDuration: '480ms',
        animationTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
        animationFillMode: 'both',
      }}
    >
      <p className="mb-4 text-center text-sm font-bold text-zinc-900">{monthLabel}</p>

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

/**
 * Month grid for streak check-ins; month navigation is controlled by the parent for API-backed days.
 */
export function StreakCalendar({
  activeDays,
  monthKey,
  onMonthKeyChange,
}: StreakCalendarProps) {
  const [slideDirection, setSlideDirection] = useState<SlideDirection>('next')
  const hasNavigated = useRef(false)
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

  /** Moves to the adjacent month and plays a slide animation in that direction. */
  function changeMonth(offset: -1 | 1) {
    hasNavigated.current = true
    setSlideDirection(offset === 1 ? 'next' : 'prev')
    const d = new Date(year, monthIndex0 + offset, 1)
    onMonthKeyChange(monthKeyFromDate(d.getFullYear(), d.getMonth()))
  }

  return (
    <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-4 sm:p-5">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors duration-200 hover:bg-white hover:text-zinc-900 active:scale-90"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-5" />
        </button>

        <div className="min-w-0 flex-1 overflow-hidden">
          <MonthGrid
            year={year}
            monthIndex0={monthIndex0}
            activeDays={activeDays}
            todayKey={todayKey}
            slideDirection={slideDirection}
            animate={hasNavigated.current}
          />
        </div>

        <button
          type="button"
          onClick={() => changeMonth(1)}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors duration-200 hover:bg-white hover:text-zinc-900 active:scale-90"
          aria-label="Next month"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
    </div>
  )
}
