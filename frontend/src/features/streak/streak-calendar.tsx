import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@shared/lib'

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

interface StreakCalendarProps {
  /** Set of ISO date strings (YYYY-MM-DD) that count as active streak days */
  activeDays: Set<string>
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function StreakCalendar({ activeDays }: StreakCalendarProps) {
  const today = new Date()
  const [viewDate, setViewDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  )

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))

  const monthName = viewDate.toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const todayKey = toDateKey(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  )

  // Build calendar grid cells
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="rounded-2xl bg-muted/50 p-5">
      {/* Month navigation */}
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors duration-200 active:scale-90"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-5" />
        </button>
        <span className="text-sm font-bold">{monthName}</span>
        <button
          type="button"
          onClick={nextMonth}
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors duration-200 active:scale-90"
          aria-label="Next month"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="mb-3 grid grid-cols-7 text-center">
        {DAY_LABELS.map((d) => (
          <span
            key={d}
            className="text-xs font-semibold text-muted-foreground"
          >
            {d}
          </span>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-2.5">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} />
          }

          const dateKey = toDateKey(year, month, day)
          const isActive = activeDays.has(dateKey)
          const isToday = dateKey === todayKey

          return (
            <div key={dateKey} className="flex items-center justify-center">
              <div
                className={cn(
                  'flex size-10 items-center justify-center rounded-full text-sm transition-all duration-200',
                  isActive
                    ? 'bg-orange-500 text-white font-semibold shadow-sm'
                    : 'bg-background text-muted-foreground',
                  isToday &&
                    !isActive &&
                    'ring-2 ring-orange-400/50 font-semibold text-foreground'
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
