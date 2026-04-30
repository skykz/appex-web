import { type HTMLAttributes } from 'react'
import { cn } from '@shared/lib'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * Placeholder shimmer used while async admin data is loading.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      role="presentation"
      {...props}
    />
  )
}
