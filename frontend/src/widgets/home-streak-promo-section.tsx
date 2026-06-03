import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Flame } from 'lucide-react'
import { cn } from '@shared/lib'
import { Button } from '@shared/ui'
import { StreakSheet } from '@features/streak'
import { streakApi } from '@features/streak/api'
import {
  countActiveDaysThisWeek,
  getCurrentWeekDays,
} from '@features/streak/week-utils'

/**
 * Home dashboard streak card: pill count, week strip, and a compact weekly goal bar.
 */
export function HomeStreakPromoSection() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const calendarMonth = new Date().toISOString().slice(0, 7)
  const weekDays = useMemo(() => getCurrentWeekDays(), [])

  const { data: streak } = useQuery({
    queryKey: ['streak'],
    queryFn: () => streakApi.get(),
    staleTime: 30_000,
  })

  const { data: calendar } = useQuery({
    queryKey: ['streak-calendar', calendarMonth],
    queryFn: () => streakApi.getCalendar(calendarMonth),
    staleTime: 60_000,
  })

  const activeDays = useMemo(
    () => new Set(calendar?.activeDays ?? []),
    [calendar?.activeDays]
  )

  const current = streak?.current ?? 0
  const weekActive = countActiveDaysThisWeek(activeDays)
  const weekGoal = 7
  const weekProgress = Math.min((weekActive / weekGoal) * 100, 100)

  return (
    <>
      <StreakSheet open={sheetOpen} onOpenChange={setSheetOpen} />

      <div className="rounded-2xl border border-border/70 bg-muted/25 p-4 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-3 py-1 text-sm font-bold tabular-nums shadow-sm">
            {current}
            <Flame
              className={cn(
                'size-4',
                current > 0 ? 'text-orange-500' : 'text-muted-foreground/50'
              )}
              aria-hidden
            />
          </span>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="text-muted-foreground hover:text-foreground text-xs font-medium underline-offset-2 hover:underline"
          >
            Details
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => {
            const isActive = activeDays.has(day.date)
            return (
              <div key={day.date} className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'flex size-8 items-center justify-center rounded-full border transition-colors sm:size-9',
                    day.isToday &&
                      'border-primary/40 bg-primary/10 ring-2 ring-primary/15',
                    !day.isToday && isActive && 'border-orange-200/80 bg-orange-50',
                    !day.isToday &&
                      !isActive &&
                      'border-border/80 bg-card text-muted-foreground/40'
                  )}
                >
                  <Flame
                    className={cn(
                      'size-3.5 sm:size-4',
                      isActive
                        ? 'text-orange-500'
                        : day.isToday
                          ? 'text-primary/70'
                          : 'text-muted-foreground/35'
                    )}
                    aria-hidden
                  />
                </div>
                <span
                  className={cn(
                    'text-[10px] font-semibold uppercase',
                    day.isToday ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {day.label}
                </span>
              </div>
            )
          })}
        </div>

        <div className="mt-4">
          <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-300 to-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
              style={{ width: `${weekProgress}%` }}
            />
          </div>
          <div className="text-muted-foreground mt-1.5 flex justify-between text-[10px] font-semibold tabular-nums">
            <span>1</span>
            <span className="text-foreground/80">
              {weekActive}/{weekGoal} this week
            </span>
            <span>{weekGoal}</span>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground mt-3 h-8 w-full text-xs"
          onClick={() => setSheetOpen(true)}
        >
          View streak calendar
        </Button>
      </div>
    </>
  )
}
