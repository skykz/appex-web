import { Sparkles } from 'lucide-react'
import { cn } from '@shared/lib'

type PlatformLoaderVariant = 'full' | 'inline' | 'compact'

interface PlatformLoaderProps {
  /** Visual scale: full-page, in-section, or tight inline spaces. */
  variant?: PlatformLoaderVariant
  /** Optional caption under the animation; full variant defaults to "Loading…". */
  label?: string
  className?: string
}

const variantStyles: Record<
  PlatformLoaderVariant,
  { frame: string; core: string; icon: string; dots: string[] }
> = {
  full: {
    frame: 'size-20',
    core: 'size-11 rounded-xl',
    icon: 'size-5',
    dots: ['size-2.5', 'size-2', 'size-1.5'],
  },
  inline: {
    frame: 'size-14',
    core: 'size-8 rounded-lg',
    icon: 'size-4',
    dots: ['size-2', 'size-1.5', 'size-1.5'],
  },
  compact: {
    frame: 'size-9',
    core: 'size-5 rounded-md',
    icon: 'size-3',
    dots: ['size-1.5', 'size-1', 'size-1'],
  },
}

/**
 * AppEx sparkle-orbit loader — central sparkles with orbiting dots (CSS-only).
 */
export function PlatformLoader({
  variant = 'inline',
  label,
  className,
}: PlatformLoaderProps) {
  const styles = variantStyles[variant]
  const caption = label ?? (variant === 'full' ? 'Loading…' : undefined)

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={caption ?? 'Loading'}
      className={cn('flex flex-col items-center justify-center gap-3', className)}
    >
      <div className={cn('relative', styles.frame)}>
        <div className="absolute inset-0 animate-[platform-orbit_2.4s_linear_infinite]">
          <span
            className={cn(
              'absolute left-1/2 top-0 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.35)]',
              styles.dots[0]
            )}
          />
        </div>
        <div
          className="absolute inset-0 animate-[platform-orbit_2.4s_linear_infinite]"
          style={{ animationDelay: '-0.8s' }}
        >
          <span
            className={cn(
              'absolute left-1/2 top-0 -translate-x-1/2 rounded-full bg-primary/75',
              styles.dots[1]
            )}
          />
        </div>
        <div
          className="absolute inset-0 animate-[platform-orbit-reverse_3.1s_linear_infinite]"
          style={{ animationDelay: '-1.2s' }}
        >
          <span
            className={cn(
              'absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-orange-400/80',
              styles.dots[2]
            )}
          />
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              'flex items-center justify-center bg-primary/10 text-primary shadow-sm ring-1 ring-primary/15',
              'animate-[platform-sparkle-pulse_2s_ease-in-out_infinite]',
              styles.core
            )}
          >
            <Sparkles className={styles.icon} strokeWidth={2.25} aria-hidden />
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
export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-background">
      <PlatformLoader variant="full" label={label} />
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
