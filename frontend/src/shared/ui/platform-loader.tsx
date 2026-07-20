import { Sparkles, type LucideIcon } from 'lucide-react'
import { cn } from '@shared/lib'

type PlatformLoaderVariant = 'full' | 'inline' | 'compact'

interface PlatformLoaderProps {
  /** Visual scale: full-page, in-section, or tight inline spaces. */
  variant?: PlatformLoaderVariant
  /** Optional caption under the animation; full variant defaults to "Loading…". */
  label?: string
  /** Center glyph inside the badge; defaults to the brand sparkle. */
  icon?: LucideIcon
  className?: string
}

const variantStyles: Record<
  PlatformLoaderVariant,
  { frame: string; ring: number; stroke: number; badge: string; icon: string }
> = {
  full: { frame: 'size-16', ring: 64, stroke: 4, badge: 'size-11 rounded-2xl', icon: 'size-5' },
  inline: { frame: 'size-12', ring: 48, stroke: 3.5, badge: 'size-8 rounded-xl', icon: 'size-4' },
  compact: { frame: 'size-8', ring: 32, stroke: 3, badge: 'size-5 rounded-lg', icon: 'size-3' },
}

/**
 * AppEx loader — a branded sparkle badge inside a smoothly sweeping progress ring.
 * CSS/SVG only (no assets), respects reduced-motion, and matches the Lexi mark.
 */
export function PlatformLoader({
  variant = 'inline',
  label,
  icon: Icon = Sparkles,
  className,
}: PlatformLoaderProps) {
  const s = variantStyles[variant]
  const caption = label ?? (variant === 'full' ? 'Loading…' : undefined)
  const r = (s.ring - s.stroke) / 2
  const c = 2 * Math.PI * r
  const center = s.ring / 2

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={caption ?? 'Loading'}
      className={cn('flex flex-col items-center justify-center gap-3.5', className)}
    >
      <div className={cn('relative', s.frame)}>
        {/* Sweeping progress ring */}
        <svg
          className="absolute inset-0 -rotate-90 animate-[platform-spin_1.1s_linear_infinite] motion-reduce:animate-none"
          viewBox={`0 0 ${s.ring} ${s.ring}`}
          aria-hidden
        >
          <circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            className="stroke-primary/15"
            strokeWidth={s.stroke}
          />
          <circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            className="stroke-primary"
            strokeWidth={s.stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * 0.72}
          />
        </svg>

        {/* Center sparkle badge — matches the Lexi mark / brand */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              'flex items-center justify-center bg-linear-to-br from-orange-500 to-amber-500 text-white shadow-sm',
              'animate-[platform-breathe_1.8s_ease-in-out_infinite] motion-reduce:animate-none',
              s.badge
            )}
          >
            <Icon className={s.icon} strokeWidth={2.25} aria-hidden />
          </div>
        </div>
      </div>

      {caption ? (
        <p className="text-sm font-medium text-muted-foreground">{caption}</p>
      ) : null}
    </div>
  )
}

/**
 * Full-viewport centered loader for route transitions and page-level fetches.
 */
export function PageLoader({
  label,
  icon,
}: {
  label?: string
  icon?: LucideIcon
}) {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-background">
      <PlatformLoader variant="full" label={label} icon={icon} />
    </div>
  )
}

/**
 * In-content loader with vertical padding for list and section fetches.
 */
export function SectionLoader({
  label,
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <div className={cn('flex w-full items-center justify-center py-16 sm:py-20', className)}>
      <PlatformLoader variant="inline" label={label} />
    </div>
  )
}
