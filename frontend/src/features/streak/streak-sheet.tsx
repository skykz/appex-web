import * as React from 'react'
import Lottie from 'lottie-react'
import { X } from 'lucide-react'
import { cn } from '@shared/lib'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@shared/ui'
import { StreakCalendar } from './streak-calendar'

interface StreakSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Mock streak data — will be replaced with API data later */
const MOCK_STREAK = {
  current: 1,
  best: 4,
  milestone: 28,
  activeDays: new Set([
    '2026-02-01',
    '2026-02-02',
    '2026-02-03',
    '2026-02-04',
    '2026-02-23',
  ]),
}

export function StreakSheet({ open, onOpenChange }: StreakSheetProps) {
  const [fireAnimationData, setFireAnimationData] =
    React.useState<Record<string, unknown> | null>(null)

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

  const { current, best, milestone, activeDays } = MOCK_STREAK
  const milestoneProgress = Math.min((current / milestone) * 100, 100)
  const isStreakActive = current > 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        hideClose
        className={cn(
          'h-[92dvh] rounded-t-3xl px-0',
          'data-[state=open]:duration-500 data-[state=closed]:duration-300'
        )}
      >
        {/* Hidden accessible description */}
        <SheetTitle className="sr-only">Streak progress</SheetTitle>
        <SheetDescription className="sr-only">
          View your daily streak progress, stats, and calendar
        </SheetDescription>

        {/* Close button — minimal, no background like reference */}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute left-5 top-5 z-10 flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors duration-200 active:scale-90"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>

        {/* Scrollable content */}
        <div className="h-full overflow-y-auto scrollbar-hide px-5 pt-16 pb-10">
          <div className="mx-auto max-w-lg space-y-8">
            {/* Page title — visible like reference */}
            <h1 className="text-xl font-bold tracking-tight">Streak progress</h1>

            {/* Hero: Streak count + Fire */}
            <div className="flex items-end justify-between">
              <div>
                <p
                  className={cn(
                    'text-8xl font-bold leading-none tracking-tighter',
                    isStreakActive
                      ? 'text-foreground'
                      : 'text-muted-foreground/30'
                  )}
                >
                  {current}
                </p>
                <p className="mt-2 text-xl font-medium text-muted-foreground">
                  Day streak!
                </p>
              </div>
              {/* Fire animation / fallback */}
              <div className="shrink-0" aria-hidden="true">
                <div
                  className={cn(
                    'size-28 motion-reduce:hidden',
                    !isStreakActive && 'opacity-40 grayscale'
                  )}
                >
                  {fireAnimationData ? (
                    <Lottie
                      animationData={fireAnimationData}
                      loop
                      autoplay
                      className="size-28"
                    />
                  ) : (
                    <div className="flex size-28 items-center justify-center text-7xl">
                      🔥
                    </div>
                  )}
                </div>
                {/* Reduced motion fallback */}
                <div
                  className={cn(
                    'hidden motion-reduce:flex size-28 items-center justify-center text-7xl',
                    !isStreakActive && 'opacity-40 grayscale'
                  )}
                >
                  🔥
                </div>
              </div>
            </div>

            {/* Streak progress milestone */}
            <div>
              <h2 className="mb-3 text-base font-bold">Streak progress</h2>
              <div className="rounded-2xl bg-muted/50 p-5 space-y-4">
                {/* Progress bar with inline badges */}
                <div className="relative flex items-center gap-3">
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      isStreakActive
                        ? 'bg-orange-500 text-white'
                        : 'bg-muted-foreground/20 text-muted-foreground'
                    )}
                  >
                    {current}
                  </span>
                  <div className="h-1.5 flex-1 rounded-full bg-background">
                    <div
                      className="h-1.5 rounded-full bg-orange-500 transition-all duration-700 ease-out"
                      style={{ width: `${milestoneProgress}%` }}
                    />
                  </div>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted-foreground/15 text-xs font-bold text-muted-foreground">
                    {milestone}
                  </span>
                </div>
                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Milestones are small streak goals. When you complete one, your
                  next target appears
                </p>
              </div>
            </div>

            {/* Streak stats — single card with divider */}
            <div>
              <h2 className="mb-3 text-base font-bold">Streak stats</h2>
              <div className="flex rounded-2xl bg-muted/50 overflow-hidden">
                <div className="flex-1 p-5">
                  <p className="text-3xl font-bold">{current}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Current streak
                  </p>
                </div>
                <div className="w-px bg-border" />
                <div className="flex-1 p-5">
                  <p className="text-3xl font-bold">{best}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Best day streak
                  </p>
                </div>
              </div>
            </div>

            {/* Calendar */}
            <StreakCalendar activeDays={activeDays} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
