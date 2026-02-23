import { Check } from 'lucide-react'
import { cn } from '@shared/lib'

const WEEK_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const

/** Get Monday-based day index (0=Mon, 6=Sun) from JS Date */
function getTodayIndex(): number {
  const jsDay = new Date().getDay() // 0=Sun, 1=Mon ... 6=Sat
  return jsDay === 0 ? 6 : jsDay - 1
}

interface DayStreakScreenProps {
  streak?: number
  onContinue: () => void
}

export function DayStreakScreen({
  streak = 1,
  onContinue,
}: DayStreakScreenProps) {
  const todayIndex = getTodayIndex()

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Content — vertically centered */}
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="flex w-full max-w-sm flex-col items-center text-center">
          {/* Streak number + fire */}
          <div className="mb-2 flex items-start justify-center">
            <span className="text-8xl font-bold leading-none tracking-tighter text-amber-500">
              {streak}
            </span>
            <span className="mt-1 text-5xl">🔥</span>
          </div>

          {/* Day streak label */}
          <p className="text-2xl font-semibold text-amber-500">Day streak!</p>

          {/* Weekly calendar card */}
          <div className="mt-8 w-full rounded-2xl border bg-card p-5">
            {/* Day labels + circles */}
            <div className="grid grid-cols-7 gap-2">
              {WEEK_DAYS.map((day, i) => {
                const isActive = i === todayIndex
                // Highlight previous days that are part of the streak (within this week only)
                const isCompleted = i < todayIndex && i >= Math.max(0, todayIndex - streak + 1)

                return (
                  <div key={day} className="flex flex-col items-center gap-2">
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        isActive
                          ? 'text-amber-500'
                          : 'text-muted-foreground'
                      )}
                    >
                      {day}
                    </span>
                    <div
                      className={cn(
                        'flex size-10 items-center justify-center rounded-full transition-all',
                        isActive
                          ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm'
                          : isCompleted
                            ? 'bg-amber-100 text-amber-500'
                            : 'bg-muted/50 text-muted-foreground/40'
                      )}
                    >
                      <Check
                        className={cn(
                          'size-5',
                          isActive || isCompleted ? 'stroke-[2.5]' : 'stroke-[2]'
                        )}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Motivational text */}
            <p className="mt-5 text-sm leading-relaxed">
              I knew you'd come back! Let's do this again{' '}
              <span className="font-semibold text-amber-500">tomorrow</span>!
            </p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="sticky bottom-0 border-t bg-background px-4 py-4">
        <div className="mx-auto flex w-full max-w-2xl justify-end">
          <button
            type="button"
            onClick={onContinue}
            className="rounded-xl bg-primary px-10 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
