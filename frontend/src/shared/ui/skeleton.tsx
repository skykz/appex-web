import * as React from 'react'
import { cn } from '@shared/lib'

/**
 * Shimmering placeholder for content that is still loading. Give it a width/height
 * (and usually a rounding) via className to match the shape of the real content.
 *
 * @example
 * <Skeleton className="h-4 w-32 rounded-md" />
 * <Skeleton className="size-11 rounded-xl" />
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn('skeleton-shimmer rounded-md', className)}
      {...props}
    />
  )
}
