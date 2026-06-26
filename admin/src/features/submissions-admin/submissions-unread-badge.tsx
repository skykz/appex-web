import { useQuery } from '@tanstack/react-query'
import { cn } from '@shared/lib'
import { fetchSubmissionsUnreadCount } from './api'

interface SubmissionsUnreadBadgeProps {
  className?: string
}

/**
 * Red pill showing unread submission count; hidden when the queue is fully read.
 */
export function SubmissionsUnreadBadge({ className }: SubmissionsUnreadBadgeProps) {
  const { data: unread = 0 } = useQuery({
    queryKey: ['admin', 'lesson-submissions', 'unread-count'],
    queryFn: fetchSubmissionsUnreadCount,
    refetchInterval: 30_000,
  })

  if (unread <= 0) return null

  return (
    <span
      className={cn(
        'ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none text-white',
        className
      )}
      aria-label={`${unread} unread submissions`}
    >
      {unread > 99 ? '99+' : unread}
    </span>
  )
}
