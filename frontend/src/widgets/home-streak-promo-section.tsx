import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Flame, Check, ChevronRight } from 'lucide-react'
import { cn } from '@shared/lib'
import { Skeleton } from '@shared/ui'
import { StreakCalendarDialog } from '@features/streak'
import { streakApi } from '@features/streak/api'
import {
  countActiveDaysThisWeek,
  getCurrentWeekDays,
} from '@features/streak/week-utils'

/**
 * Short encouragement shown beside the weekly goal, scaled to how the week is going.
 */
function getWeekMessage(active: number, goal: number, todayDone: boolean): string {
  if (active >= goal) return 'Perfect week! 🎉'
  const remaining = goal - active
  if (active === 0) return 'Start your first day'
  if (!todayDone) return "Keep it going today"
  if (remaining === 1) return '1 day to a perfect week'
  return `${remaining} days to go`
}

/**
 * Home dashboard streak card: pill count, week strip, and a compact weekly goal bar.
 */
export function HomeStreakPromoSection() {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const calendarMonth = new Date().toISOString().slice(0, 7)
  const weekDays = useMemo(() => getCurrentWeekDays(), [])

  const { data: streak, isPending: streakLoading } = useQuery({
    queryKey: ['streak'],
    queryFn: () => streakApi.get(),
    staleTime: 30_000,
  })

  const { data: calendar, isPending: calendarLoading } = useQuery({
    queryKey: ['streak-calendar', calendarMonth],
    queryFn: () => streakApi.getCalendar(calendarMonth),
    staleTime: 60_000,
  })

  const loading = streakLoading || calendarLoading

  const activeDays = useMemo(
    () => new Set(calendar?.activeDays ?? []),
    [calendar?.activeDays]
  )

  const current = streak?.current ?? 0
  const weekActive = countActiveDaysThisWeek(activeDays)
  const weekGoal = 5
  const weekProgress = Math.min((weekActive / weekGoal) * 100, 100)
  const todayKey = weekDays.find((d) => d.isToday)?.date
  const todayDone = todayKey ? activeDays.has(todayKey) : false
  const streakActive = current > 0
  const streakLabel = streakActive ? 'day streak' : 'Start your streak'

  return (
    <>
      <StreakCalendarDialog open={calendarOpen} onOpenChange={setCalendarOpen} />

      <div className="rounded-2xl border border-border/70 bg-muted/25 p-5 shadow-sm">
        {/* Header — count + what it means, so the number isn't floating alone. */}
        <div className="mb-4 flex items-center gap-2.5">
          {loading ? (
            <Skeleton className="h-8 w-28 rounded-full" />
          ) : (
            <>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold tabular-nums shadow-sm',
                  streakActive
                    ? 'border-orange-200/80 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-950/40 dark:text-orange-300'
                    : 'border-border/80 bg-card text-muted-foreground'
                )}
              >
                {current}
                <Flame
                  className={cn(
                    'size-4',
                    streakActive ? 'text-orange-500' : 'text-muted-foreground/50'
                  )}
                  aria-hidden
                />
              </span>
              <span
                className={cn(
                  'text-sm font-semibold',
                  streakActive ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {streakLabel}
              </span>
            </>
          )}
        </div>

        {/* Week strip — check = done, flame = today, dot = not yet. */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => {
            if (loading) {
              return (
                <div
                  key={day.date}
                  className="flex flex-col items-center gap-1.5"
                >
                  <Skeleton className="size-8 rounded-full sm:size-9" />
                  <Skeleton className="h-2.5 w-5 rounded-full" />
                </div>
              )
            }
            const isActive = activeDays.has(day.date)
            const isFuture = todayKey ? day.date > todayKey : false
            return (
              <div key={day.date} className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'flex size-8 items-center justify-center rounded-full border transition-colors sm:size-9',
                    // Completed day: solid orange with a check.
                    isActive &&
                      !day.isToday &&
                      'border-transparent bg-orange-500 text-white shadow-sm',
                    // Today: highlighted ring; flame lit if already done.
                    day.isToday &&
                      (isActive
                        ? 'border-transparent bg-orange-500 text-white shadow-sm ring-2 ring-orange-300/60'
                        : 'border-primary/40 bg-primary/10 ring-2 ring-primary/15'),
                    // Missed past / upcoming days: neutral, dimmer if still ahead.
                    !isActive &&
                      !day.isToday &&
                      cn(
                        'border-border/70 bg-card',
                        isFuture ? 'opacity-60' : ''
                      )
                  )}
                >
                  {isActive ? (
                    day.isToday ? (
                      <Flame className="size-3.5 sm:size-4" aria-hidden />
                    ) : (
                      <Check
                        className="size-3.5 sm:size-4"
                        strokeWidth={3}
                        aria-hidden
                      />
                    )
                  ) : day.isToday ? (
                    <Flame
                      className="size-3.5 text-primary/70 sm:size-4"
                      aria-hidden
                    />
                  ) : (
                    <span
                      className="size-1 rounded-full bg-muted-foreground/30"
                      aria-hidden
                    />
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-semibold uppercase',
                    day.isToday
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-muted-foreground'
                  )}
                >
                  {day.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Weekly goal — count on the left, encouragement on the right. */}
        <div className="mt-4">
          {loading ? (
            <>
              <Skeleton className="h-1.5 w-full rounded-full" />
              <div className="mt-2 flex justify-between">
                <Skeleton className="h-2.5 w-16 rounded-full" />
                <Skeleton className="h-2.5 w-20 rounded-full" />
              </div>
            </>
          ) : (
            <>
              <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-linear-to-r from-orange-300 to-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
                  style={{ width: `${weekProgress}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-semibold">
                <span className="text-foreground/80 tabular-nums">
                  {weekActive}/{weekGoal} days this week
                </span>
                <span className="text-muted-foreground">
                  {getWeekMessage(weekActive, weekGoal, todayDone)}
                </span>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setCalendarOpen(true)}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground active:scale-[0.99]"
        >
          View streak calendar
          <ChevronRight className="size-3.5" aria-hidden />
        </button>
      </div>
    </>
  )
}
