import * as React from 'react'
import Lottie from 'lottie-react'
import { cn } from '@shared/lib'

/**
 * ProgressCard - Animated progress indicator card.
 * Displays a progress bar with:
 * - Tooltip-style percentage bubble with arrow pointing down
 * - Fire (Lottie) indicator on the progress line
 * - Animated transitions on value change
 * - Idle floating animation on the bubble
 * - Respects prefers-reduced-motion for accessibility
 */

interface ProgressCardProps {
  /** Progress value from 0 to 100 */
  progress: number
  /** Optional label text (default: "Keep going!") */
  label?: string
  /** Additional class names for the container */
  className?: string
}

export const ProgressCard = React.forwardRef<HTMLDivElement, ProgressCardProps>(
  ({ progress, label = 'Keep going!', className }, ref) => {
    /**
     * Animated progress state.
     * We start at 0 and animate to the target value on mount/change.
     * This ensures CSS transitions actually play (from 0 → target).
     */
    const [animatedProgress, setAnimatedProgress] = React.useState(0)

    /**
     * Fire indicator animation data (Lottie JSON).
     * Loaded from `public/animation/fire.json` via HTTP so we don't bundle large JSON into JS.
     */
    const [fireAnimationData, setFireAnimationData] =
      React.useState<Record<string, unknown> | null>(null)

    React.useEffect(() => {
      /**
       * Loads the Lottie JSON once on mount.
       * Uses AbortController to prevent state updates after unmount.
       */
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
          // Ignore abort errors; other failures simply fall back to reduced-motion dot / empty state.
          if (controller.signal.aborted) return
        }
      })()

      return () => controller.abort()
    }, [])

    React.useEffect(() => {
      // Clamp progress to valid range
      const clampedProgress = Math.max(0, Math.min(100, progress))

      // Use rAF to ensure the initial render (width: 0) happens first,
      // then trigger the transition to the target value
      const raf = requestAnimationFrame(() => {
        setAnimatedProgress(clampedProgress)
      })

      return () => cancelAnimationFrame(raf)
    }, [progress])

    return (
      <div
        ref={ref}
        // Card background styling (persisted from browser preview):
        // - background-color: rgba(237, 237, 237, 1)
        // - background-image: none
        className={cn('bg-[#ededed] bg-none rounded-3xl p-6', className)}
      >
        {/* Top row: Tooltip bubble + Keep going label */}
        <div className="relative mb-4 flex items-end justify-between">
          {/* Spacer to position bubble correctly */}
          <div
            className="relative"
            style={{ width: `${animatedProgress}%` }}
          >
            {/* Tooltip bubble with percentage */}
            <div
              className={cn(
                'absolute bottom-0 left-full flex flex-col items-center',
                'transition-[left] duration-700 ease-out',
                // Idle floating animation (subtle bob up/down)
                'animate-[float_2.2s_ease-in-out_infinite]',
                // Respect reduced motion preference
                'motion-reduce:animate-none motion-reduce:transition-none'
              )}
              style={{ transform: 'translateX(-50%)' }}
            >
              {/* Bubble body */}
              <div
                className={cn(
                  // Bubble gradient matches the progress-fill gradient so the tooltip feels connected to the indicator.
                  'flex h-10 min-w-14 items-center justify-center rounded-2xl px-3 text-base font-bold',
                  'bg-linear-to-r from-[#C97603] to-[#F2DCAB]',
                  // Dark text improves contrast against the light end of the gradient.
                  'text-[#1b1b1b]',
                  // Subtle elevation to match the progress-fill shadow.
                  'shadow-[0px_4px_12px_rgba(0,0,0,0.15)]'
                )}
              >
                {Math.round(animatedProgress)}%
              </div>
              {/* "Drop" pointer aimed toward the fire indicator (progress position). */}
              <div
                className={cn(
                  /**
                   * Teardrop pointer:
                   * - a square rotated 45deg
                   * - keep bottom-left corner sharp (becomes the "tip" pointing down after rotation)
                   * - round the other three corners to read as a "drop"
                   */
                  // Use `-rotate-45` so the sharp corner (bottom-left) points visually downward in CSS coordinates.
                  'h-3 w-3 -rotate-45',
                  // `rounded-full` rounds all corners, `rounded-bl-none` keeps one corner sharp for the tip.
                  'rounded-full rounded-bl-none',
                  // Slight overlap with the bubble body so it feels attached.
                  '-mt-1',
                  // Keep the same gradient direction as the bubble.
                  'bg-linear-to-r from-[#C97603] to-[#F2DCAB]',
                  // Match bubble shadow.
                  'shadow-[0px_4px_12px_rgba(0,0,0,0.15)]'
                )}
              />
            </div>
          </div>

          {/* Keep going label - right side */}
          {/* Slanted label (like "/"): skew the pill, unskew the text for readability */}
          <div className="rounded-full bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm -skew-x-12">
            <span className="inline-block skew-x-12">{label}</span>
          </div>
        </div>

        {/* Progress bar track */}
        {/* Track styling (persisted from browser preview): 15px tall + ring-offset background color */}
        <div className="relative h-[15px] w-full rounded-full bg-(--tw-ring-offset-color)">
          {/* Fill (animated width) */}
          <div
            className={cn(
              // Fill styling (persisted from browser preview): 15px tall + custom gradient + subtle shadow
              'absolute left-0 top-0 h-[15px] rounded-full',
              'transition-[width] duration-700 ease-out',
              'motion-reduce:transition-none'
            )}
            style={{
              width: `${animatedProgress}%`,
              background:
                'linear-gradient(90deg, rgba(201, 118, 3, 1) 0%, rgba(242, 220, 171, 1) 91%)',
              boxShadow: '0px 4px 12px 0px rgba(0, 0, 0, 0.15)',
            }}
          />

          {/* Progress indicator (fire Lottie) on progress position */}
          <div
            className={cn(
              // Fire should be larger and sit above (on top of) the slider/track.
              // - `top-0` + translateY(<0) lifts it above the bar.
              // - `z-10` ensures it renders above the fill/track.
              'absolute top-0 z-10 flex h-12 w-12 items-center justify-center',
              'pointer-events-none select-none',
              'transition-[left] duration-700 ease-out',
              'motion-reduce:transition-none'
            )}
            style={{
              left: `${animatedProgress}%`,
              // Slightly lower than before (less negative translateY).
              transform: 'translate(-50%, -40%)',
            }}
            aria-hidden="true"
          >
            {/* Animated fire. Hidden for reduced motion users. */}
            <div className="h-12 w-12 motion-reduce:hidden">
              {fireAnimationData ? (
                <Lottie
                  animationData={fireAnimationData}
                  loop
                  autoplay
                  className="h-12 w-12"
                />
              ) : null}
            </div>

            {/* Reduced motion fallback: static dot (matches previous design). */}
            <div className="hidden h-5 w-5 rounded-full border-[3px] border-primary bg-background motion-reduce:block" />
          </div>
        </div>
      </div>
    )
  }
)

ProgressCard.displayName = 'ProgressCard'
