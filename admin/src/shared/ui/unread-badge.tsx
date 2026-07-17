import { useQuery, type QueryKey } from '@tanstack/react-query'
import { cn } from '@shared/lib'

interface UnreadBadgeProps {
  /** React Query key for the unread-count query. */
  queryKey: QueryKey
  /** Fetches the current unread count. */
  queryFn: () => Promise<number>
  /** Accessible label suffix, e.g. "unread messages". */
  label: string
  className?: string
}

/**
 * Red count pill that polls an unread-count endpoint every 30s and hides itself
 * when the count is zero. Shared by the Inbox and Submissions sidebar badges.
 */
export function UnreadBadge({ queryKey, queryFn, label, className }: UnreadBadgeProps) {
  const { data: unread = 0 } = useQuery({
    queryKey,
    queryFn,
    refetchInterval: 30_000,
  })

  if (unread <= 0) return null

  return (
    <span
      className={cn(
        'ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none text-white',
        className
      )}
      aria-label={`${unread} ${label}`}
    >
      {unread > 99 ? '99+' : unread}
    </span>
  )
}
