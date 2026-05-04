import * as React from 'react'
import Lottie from 'lottie-react'
import { ChevronDown, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@shared/lib'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@shared/ui'
import { StreakCalendar } from './streak-calendar'
import { streakApi } from './api'

interface StreakSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Centered dialog for streak count, milestone bar, fire animation, and an optional calendar (collapsed by default). Sized for comfortable reading and scrolling.
 */
export function StreakSheet({ open, onOpenChange }: StreakSheetProps) {
  const [fireAnimationData, setFireAnimationData] =
    React.useState<Record<string, unknown> | null>(null)

  const [calendarMonth, setCalendarMonth] = React.useState(() =>
    new Date().toISOString().slice(0, 7)
  )

  React.useEffect(() => {
    const controller = new AbortController()

    ;(async () => {
      try {
        const res = await fetch('/animation/fire.json', {
          signal: controller.signal,
        })
        if (!res.ok) return
        const json = (await res.json()) as Record<string, unknown>
        setFireAnimationData(json)
      } catch {
        if (controller.signal.aborted) return
      }
    })()

    return () => controller.abort()
  }, [])

  React.useEffect(() => {
    if (open) {
      setCalendarMonth(new Date().toISOString().slice(0, 7))
    }
  }, [open])

  const { data: streak } = useQuery({
    queryKey: ['streak'],
    queryFn: () => streakApi.get(),
    enabled: open,
  })

  const { data: calendar } = useQuery({
    queryKey: ['streak-calendar', calendarMonth],
    queryFn: () => streakApi.getCalendar(calendarMonth),
    enabled: open,
  })

  const current = streak?.current ?? 0
  const best = streak?.best ?? 0
  const milestone = streak?.milestone ?? 28
  const activeDays = React.useMemo(
    () => new Set(calendar?.activeDays ?? []),
    [calendar?.activeDays]
  )

  const milestoneProgress = Math.min((current / milestone) * 100, 100)
  const isStreakActive = current > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className={cn(
          'max-h-[min(92dvh,760px)] max-w-[min(calc(100vw-2rem),36rem)] gap-0 overflow-hidden border-2 border-orange-200 p-0 shadow-2xl sm:max-w-lg md:max-w-xl',
          /* Light paper panel even in dark UI — reads clearly on the dim overlay */
          'bg-white text-zinc-900 ring-1 ring-orange-100 dark:bg-white dark:text-zinc-900'
        )}
      >
        <DialogTitle className="sr-only">Streak progress</DialogTitle>
        <DialogDescription className="sr-only">
          Your daily streak, milestone progress, and optional activity calendar
        </DialogDescription>

        {/* Hero — same orange/amber language as the Home streak pill */}
        <div
          className={cn(
            'relative border-b border-orange-100 px-6 pb-6 pt-7 sm:px-8 sm:pb-7 sm:pt-8',
            'bg-gradient-to-br from-orange-50 via-amber-50 to-white'
          )}
        >
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full text-zinc-600 transition-colors duration-200 hover:bg-orange-100 hover:text-zinc-900 active:scale-90"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>

          <p className="mb-5 text-center text-xs font-bold uppercase tracking-[0.12em] text-orange-900 sm:text-sm">
            Streak
          </p>

          <div className="flex items-end justify-center gap-3 sm:gap-4">
            <div className="text-center">
              <p
                className={cn(
                  'text-7xl font-bold leading-none tracking-tighter tabular-nums sm:text-8xl',
                  isStreakActive ? 'text-orange-600' : 'text-orange-300'
                )}
              >
                {current}
              </p>
              <p className="mt-2 text-base font-semibold text-orange-900">
                Day streak!
              </p>
            </div>
            <div className="shrink-0 pb-1" aria-hidden="true">
              <div
                className={cn(
                  'size-28 motion-reduce:hidden sm:size-32',
                  !isStreakActive && 'opacity-45 saturate-50'
                )}
              >
                {fireAnimationData ? (
                  <Lottie
                    animationData={fireAnimationData}
                    loop
                    autoplay
                    className="size-28 sm:size-32"
                  />
                ) : (
                  <div className="flex size-28 items-center justify-center text-6xl drop-shadow-sm sm:size-32 sm:text-7xl">
                    🔥
                  </div>
                )}
              </div>
              <div
                className={cn(
                  'hidden size-28 motion-reduce:flex items-center justify-center text-6xl sm:size-32',
                  !isStreakActive && 'opacity-50'
                )}
              >
                🔥
              </div>
            </div>
          </div>
        </div>

        <div className="max-h-[min(58dvh,440px)] space-y-5 overflow-y-auto overscroll-contain bg-white px-6 py-5 sm:px-8 sm:py-6">
          <div className="space-y-4 rounded-2xl border border-orange-100 bg-orange-50/50 p-5">
            <div className="relative flex items-center gap-3">
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums',
                  isStreakActive
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-zinc-200 text-zinc-600'
                )}
              >
                {current}
              </span>
              <div className="h-2 flex-1 rounded-full bg-orange-100">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-700 ease-out"
                  style={{ width: `${milestoneProgress}%` }}
                />
              </div>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold tabular-nums text-zinc-600 ring-1 ring-orange-100">
                {milestone}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-zinc-600">
              Milestones are small streak goals. When you complete one, your next
              target appears.
            </p>
          </div>

          <div className="flex overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
            <div className="flex-1 p-5">
              <p className="text-3xl font-bold tabular-nums text-zinc-900">
                {current}
              </p>
              <p className="mt-1.5 text-sm font-medium text-zinc-500">
                Current streak
              </p>
            </div>
            <div className="w-px bg-orange-100" />
            <div className="flex-1 p-5">
              <p className="text-3xl font-bold tabular-nums text-zinc-900">
                {best}
              </p>
              <p className="mt-1.5 text-sm font-medium text-zinc-500">
                Best day streak
              </p>
            </div>
          </div>

          <details className="group overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
            <summary className="cursor-pointer list-none px-5 py-4 text-base font-semibold text-zinc-900 outline-none transition-colors hover:bg-orange-50/80 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-2">
                View calendar
                <ChevronDown className="size-4 shrink-0 text-orange-600 transition-transform duration-200 group-open:-rotate-180" />
              </span>
            </summary>
            <div className="border-t border-orange-100 bg-white px-3 pb-4 pt-3">
              <StreakCalendar
                activeDays={activeDays}
                monthKey={calendarMonth}
                onMonthKeyChange={setCalendarMonth}
              />
            </div>
          </details>
        </div>
      </DialogContent>
    </Dialog>
  )
}
