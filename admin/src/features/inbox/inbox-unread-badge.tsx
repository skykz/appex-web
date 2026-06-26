import { useQuery } from '@tanstack/react-query'
import { cn } from '@shared/lib'
import { fetchContactUnreadCount } from './api'

interface InboxUnreadBadgeProps {
  className?: string
}

/**
 * Red pill showing unread inbox count; hidden when there are no unread messages.
 */
export function InboxUnreadBadge({ className }: InboxUnreadBadgeProps) {
  const { data: unread = 0 } = useQuery({
    queryKey: ['admin', 'contact-messages', 'unread-count'],
    queryFn: fetchContactUnreadCount,
    refetchInterval: 30_000,
  })

  if (unread <= 0) return null

  return (
    <span
      className={cn(
        'ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none text-white',
        className
      )}
      aria-label={`${unread} unread messages`}
    >
      {unread > 99 ? '99+' : unread}
    </span>
  )
}
