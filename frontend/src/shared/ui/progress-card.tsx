import * as React from 'react'
import { BookMarked } from 'lucide-react'
import { cn } from '@shared/lib'

/**
 * Course / plan progress summary: distinct from streak (no flame); uses book motif and cool gradient.
 */
interface ProgressCardProps {
  /** Progress value from 0 to 100 */
  progress: number
  /** Optional encouragement line (default: "Keep going!") */
  label?: string
  /** Additional class names for the container */
  className?: string
}

export const ProgressCard = React.forwardRef<HTMLDivElement, ProgressCardProps>(
  ({ progress, label = 'Keep going!', className }, ref) => {
    /** Animated width for the fill bar so the transition runs after mount. */
    const [animatedProgress, setAnimatedProgress] = React.useState(0)

    React.useEffect(() => {
      const clamped = Math.max(0, Math.min(100, progress))
      const raf = requestAnimationFrame(() => setAnimatedProgress(clamped))
      return () => cancelAnimationFrame(raf)
    }, [progress])

    const pct = Math.round(animatedProgress)

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl border border-border bg-card p-5 shadow-sm',
          className
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Plan progress
            </p>
            <p className="text-sm leading-snug text-muted-foreground">{label}</p>
          </div>
          <span
            className="shrink-0 text-3xl font-bold tabular-nums tracking-tight text-foreground"
            aria-live="polite"
          >
            {pct}%
          </span>
        </div>

        <div className="relative mt-5 px-1.5 pt-1">
          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={cn(
                'h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-primary',
                'transition-[width] duration-700 ease-out',
                'motion-reduce:transition-none'
              )}
              style={{ width: `${animatedProgress}%` }}
            />
          </div>

          <div
            className={cn(
              'pointer-events-none absolute top-1/2 z-[1] flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center',
              'rounded-full border border-indigo-200/80 bg-background shadow-md ring-2 ring-indigo-500/10',
              'transition-[left] duration-700 ease-out motion-reduce:transition-none',
              'dark:border-indigo-500/40 dark:ring-indigo-400/20'
            )}
            style={{ left: `${animatedProgress}%` }}
            aria-hidden
          >
            <BookMarked className="size-3.5 text-indigo-600 dark:text-indigo-400" strokeWidth={2} />
          </div>
        </div>
      </div>
    )
  }
)

ProgressCard.displayName = 'ProgressCard'
