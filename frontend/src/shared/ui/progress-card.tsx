import * as React from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Sparkles } from 'lucide-react'
import { cn } from '@shared/lib'

const RING_SIZE = 148
const STROKE = 7
const RADIUS = (RING_SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const CENTER = RING_SIZE / 2

/**
 * Course / plan progress summary with a circular ring and optional featured-course link.
 */
interface ProgressCardProps {
  /** Progress value from 0 to 100 */
  progress: number
  /** Optional encouragement line (default: "Keep going!") */
  label?: string
  /** Featured course title shown below the ring */
  featuredTitle?: string
  /** Link target for the featured course row */
  featuredHref?: string
  /** Additional class names for the container */
  className?: string
}

export const ProgressCard = React.forwardRef<HTMLDivElement, ProgressCardProps>(
  (
    {
      progress,
      label = 'Keep going!',
      featuredTitle,
      featuredHref,
      className,
    },
    ref
  ) => {
    const [animatedProgress, setAnimatedProgress] = React.useState(0)

    React.useEffect(() => {
      const clamped = Math.max(0, Math.min(100, progress))
      const raf = requestAnimationFrame(() => setAnimatedProgress(clamped))
      return () => cancelAnimationFrame(raf)
    }, [progress])

    const pct = Math.round(animatedProgress)
    const dashOffset =
      CIRCUMFERENCE - (animatedProgress / 100) * CIRCUMFERENCE
    const dotAngle = ((animatedProgress / 100) * 360 - 90) * (Math.PI / 180)
    const dotX = CENTER + RADIUS * Math.cos(dotAngle)
    const dotY = CENTER + RADIUS * Math.sin(dotAngle)

    const footer =
      featuredTitle && featuredHref ? (
        <Link
          to={featuredHref}
          className="text-muted-foreground hover:text-foreground mt-4 flex w-full items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2.5 text-sm font-medium transition-colors"
        >
          <span className="min-w-0 truncate">{featuredTitle}</span>
          <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
        </Link>
      ) : (
        <p className="text-muted-foreground mt-4 text-center text-xs">{label}</p>
      )

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl border border-border/70 bg-muted/25 p-5 shadow-sm',
          className
        )}
      >
        <div className="flex flex-col items-center">
          <div
            className="relative"
            style={{ width: RING_SIZE, height: RING_SIZE }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Plan progress ${pct} percent`}
          >
            <svg
              width={RING_SIZE}
              height={RING_SIZE}
              className="-rotate-90"
              aria-hidden
            >
              <defs>
                <linearGradient id="plan-progress-ring" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--primary) / 0.35)" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" />
                </linearGradient>
              </defs>
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                className="stroke-muted/80"
                strokeWidth={STROKE}
              />
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke="url(#plan-progress-ring)"
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
              />
            </svg>

            {animatedProgress > 0 && (
              <span
                className="absolute size-2.5 rounded-full bg-primary shadow-sm ring-2 ring-background"
                style={{
                  left: dotX - 5,
                  top: dotY - 5,
                }}
                aria-hidden
              />
            )}

            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
              <div className="bg-primary text-primary-foreground flex size-11 items-center justify-center rounded-xl shadow-md ring-2 ring-primary/20">
                <Sparkles className="size-5" strokeWidth={2} aria-hidden />
              </div>
              <span
                className="text-foreground text-sm font-bold tabular-nums"
                aria-live="polite"
              >
                {pct}%
              </span>
            </div>
          </div>

          <p className="text-muted-foreground mt-3 text-center text-xs font-semibold uppercase tracking-wider">
            Plan progress
          </p>
        </div>

        {footer}
      </div>
    )
  }
)

ProgressCard.displayName = 'ProgressCard'
