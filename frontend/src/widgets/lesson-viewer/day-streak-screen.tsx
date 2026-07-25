import { useEffect, useRef, useState } from 'react'
import Lottie from 'lottie-react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { streakApi } from '@features/streak/api'
import { cn } from '@shared/lib'
import { Button, PlatformLoader } from '@shared/ui'

type TFn = ReturnType<typeof useTranslation>['t']

const WEEK_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const

/**
 * Monday-based index in 0..6 for the current local day (0 = Monday).
 */
function getTodayIndex(): number {
  const jsDay = new Date().getDay()
  return jsDay === 0 ? 6 : jsDay - 1
}

/** True when the user has asked the OS to minimize motion. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )
}

/**
 * Animates a number up to `target`, easing out over `duration` ms. Respects
 * reduced-motion by snapping straight to the target. Animates FROM the previously
 * displayed value (not always 0), so if `target` resolves or changes mid-view
 * (e.g. a background refetch) the number transitions smoothly instead of snapping to 0.
 */
function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)
  // Track the latest displayed value without retriggering the animation effect.
  const valueRef = useRef(0)
  useEffect(() => {
    valueRef.current = value
  }, [value])

  // Intentional setState-in-effect: this hook synchronizes React state to two external
  // systems — the rAF animation clock and the async-resolving `target` — which is the
  // sanctioned use of an effect. Snapping/animating cannot be derived during render.
  useEffect(() => {
    if (target <= 0 || prefersReducedMotion()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(target)
      return
    }
    const from = valueRef.current
    if (from === target) return
    // Small delay so the count-up starts after the card has begun rising in.
    const startDelay = 250
    let startTime: number | null = null
    const tick = (now: number) => {
      if (startTime === null) startTime = now
      const elapsed = now - startTime
      const t = Math.min(1, elapsed / duration)
      // easeOutCubic, interpolating from the prior value to the target.
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(from + (target - from) * eased))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    const timer = window.setTimeout(() => {
      rafRef.current = requestAnimationFrame(tick)
    }, startDelay)
    return () => {
      window.clearTimeout(timer)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration])

  return value
}

/**
 * Streak-day-aware encouragement shown under the week strip. Early days get
 * warmer "you came back" copy; longer streaks lean into momentum. All copy is
 * localized via the `dayStreak.message.*` keys.
 */
function getStreakMessage(t: TFn, current: number): string {
  if (current <= 0) return t('dayStreak.message.none')
  if (current === 1) return t('dayStreak.message.day1')
  if (current === 2) return t('dayStreak.message.day2')
  if (current === 3) return t('dayStreak.message.day3')
  if (current < 7) return t('dayStreak.message.week', { count: current })
  if (current < 14) return t('dayStreak.message.twoWeeks', { count: current })
  if (current < 30) return t('dayStreak.message.month', { count: current })
  return t('dayStreak.message.legend', { count: current })
}

interface DayStreakScreenProps {
  onContinue: () => void
}

/**
 * Post-lesson celebration: live streak from the API, fire animation, and a week strip that
 * only shows checks on days that count toward the streak (not on future/empty days).
 */
export function DayStreakScreen({ onContinue }: DayStreakScreenProps) {
  const { t } = useTranslation()
  const [fireAnimationData, setFireAnimationData] = useState<Record<
    string,
    unknown
  > | null>(null)

  const todayIndex = getTodayIndex()

  const { data: streak, isPending } = useQuery({
    queryKey: ['streak'],
    queryFn: () => streakApi.get(),
  })

  const current = streak?.current ?? 0
  const best = streak?.best ?? 0
  const isStreakActive = current > 0
  const displayCount = useCountUp(current)
  const todayIsActive = isStreakActive

  useEffect(() => {
    const controller = new AbortController()
    ;(async () => {
      try {
        const res = await fetch('/animation/fire.json', {
          signal: controller.signal,
        })
        if (!res.ok) return
        setFireAnimationData((await res.json()) as Record<string, unknown>)
      } catch {
        if (controller.signal.aborted) return
      }
    })()
    return () => controller.abort()
  }, [])

  // Gate the celebration until the streak is known — otherwise it briefly flashes "0".
  if (isPending) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-background">
        <PlatformLoader variant="inline" />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 pb-6 pt-4">
        <div className="streak-anim-card w-full max-w-sm overflow-hidden rounded-3xl border-2 border-orange-200/80 bg-card text-card-foreground shadow-xl ring-1 ring-orange-200/50 dark:border-orange-500/30 dark:ring-orange-500/20">
          {/* Hero — matches app streak / home pill language */}
          <div
            className={cn(
              'relative overflow-hidden border-b border-orange-200/80 px-5 pb-5 pt-6',
              'bg-linear-to-br from-orange-100 via-amber-50 to-orange-50',
              'dark:border-orange-500/25 dark:from-orange-950 dark:via-amber-950/80 dark:to-background'
            )}
          >
            {/* Soft breathing glow behind the hero number/flame. */}
            {isStreakActive && (
              <div
                aria-hidden
                className="streak-anim-glow pointer-events-none absolute left-1/2 top-1/2 size-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-400/25 blur-3xl dark:bg-orange-500/20"
              />
            )}

            <p
              className="streak-anim-up relative mb-3 text-center text-xs font-bold uppercase tracking-[0.14em] text-orange-900/90 dark:text-orange-200"
              style={{ animationDelay: '0.15s' }}
            >
              {t('dayStreak.eyebrow')}
            </p>

            <div className="relative flex items-end justify-center gap-3">
              <div className="text-center">
                <p
                  className={cn(
                    'streak-anim-pop text-7xl font-bold leading-none tracking-tighter tabular-nums sm:text-8xl',
                    isStreakActive
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-orange-900/35 dark:text-orange-200/35'
                  )}
                  style={{ animationDelay: '0.2s' }}
                >
                  {displayCount}
                </p>
                <p
                  className="streak-anim-up mt-2 text-base font-semibold text-orange-900/90 dark:text-orange-50"
                  style={{ animationDelay: '0.45s' }}
                >
                  {t('dayStreak.dayStreak')}
                </p>
              </div>

              <div className="shrink-0 pb-1" aria-hidden="true">
                <div
                  className={cn(
                    'streak-anim-flame size-[4.5rem] motion-reduce:hidden sm:size-24',
                    !isStreakActive && 'opacity-50 saturate-50'
                  )}
                >
                  {fireAnimationData ? (
                    <Lottie
                      animationData={fireAnimationData}
                      loop
                      autoplay
                      className="size-[4.5rem] sm:size-24"
                    />
                  ) : (
                    <div className="flex size-[4.5rem] items-center justify-center text-5xl sm:size-24 sm:text-6xl">
                      🔥
                    </div>
                  )}
                </div>
                <div
                  className={cn(
                    'hidden size-[4.5rem] motion-reduce:flex items-center justify-center text-5xl sm:size-24',
                    !isStreakActive && 'opacity-50'
                  )}
                >
                  🔥
                </div>
              </div>
            </div>

            <p
              className="streak-anim-up relative mt-4 text-center text-xs text-orange-950/70 dark:text-orange-100/75"
              style={{ animationDelay: '0.55s' }}
            >
              {t('dayStreak.bestStreak', { count: best })}
            </p>
          </div>

          {/* Week strip — checks only on streak days; no misleading icons on future days */}
          <div className="bg-card px-4 py-5">
            <p
              className="streak-anim-up mb-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              style={{ animationDelay: '0.6s' }}
            >
              {t('dayStreak.thisWeek')}
            </p>
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {WEEK_DAYS.map((day, i) => {
                const isToday = i === todayIndex
                const isCompleted =
                  i < todayIndex &&
                  i >= Math.max(0, todayIndex - current + 1) &&
                  current > 0
                // Stagger each pill left→right, starting after the hero settles.
                const dayDelay = `${0.7 + i * 0.07}s`

                return (
                  <div key={day} className="flex flex-col items-center gap-1.5">
                    <span
                      className={cn(
                        'text-[10px] font-semibold uppercase sm:text-xs',
                        isToday
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-muted-foreground'
                      )}
                    >
                      {day}
                    </span>
                    <div
                      className={cn(
                        'streak-anim-day relative flex size-9 items-center justify-center rounded-full border text-center sm:size-10',
                        isToday &&
                          'border-orange-400 bg-linear-to-br from-amber-400 to-orange-500 text-white shadow-md ring-2 ring-orange-300/50 dark:ring-orange-500/40',
                        !isToday &&
                          isCompleted &&
                          'border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200',
                        !isToday &&
                          !isCompleted &&
                          'border-border bg-card text-muted-foreground shadow-sm'
                      )}
                      style={{ animationDelay: dayDelay }}
                    >
                      {/* Celebratory halo that pings out from today's pill. */}
                      {isToday && todayIsActive && (
                        <span
                          aria-hidden
                          className="streak-anim-ring absolute inset-0 rounded-full ring-2 ring-orange-400/70"
                        />
                      )}
                      {isToday ? (
                        <Check
                          className="streak-anim-check size-4 text-white sm:size-5"
                          strokeWidth={2.5}
                          aria-hidden
                          style={{ animationDelay: '1.35s' }}
                        />
                      ) : isCompleted ? (
                        <Check
                          className="size-4 sm:size-5"
                          strokeWidth={2.5}
                          aria-hidden
                        />
                      ) : (
                        <span
                          className="text-[10px] font-medium text-muted-foreground/40"
                          aria-hidden
                        >
                          ·
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <p
              className="streak-anim-up mt-5 text-center text-sm leading-relaxed text-muted-foreground"
              style={{ animationDelay: '1.3s' }}
            >
              {getStreakMessage(t, current)}
            </p>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-border bg-background/95 px-4 py-4 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex w-full max-w-2xl justify-end">
          <Button
            onClick={onContinue}
            size="xl"
            className="streak-anim-up min-w-[10rem] px-10"
            style={{ animationDelay: '1.5s' }}
          >
            {t('dayStreak.continue')}
          </Button>
        </div>
      </div>
    </div>
  )
}
