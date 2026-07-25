import { UnreadBadge } from '@shared/ui/unread-badge'
import { fetchContactUnreadCount } from './api'

interface InboxUnreadBadgeProps {
  className?: string
}

/**
 * Red pill showing unread inbox count; hidden when there are no unread messages.
 */
export function InboxUnreadBadge({ className }: InboxUnreadBadgeProps) {
  return (
    <UnreadBadge
      queryKey={['admin', 'contact-messages', 'unread-count']}
      queryFn={fetchContactUnreadCount}
      label="unread messages"
      className={className}
    />
  )
}
