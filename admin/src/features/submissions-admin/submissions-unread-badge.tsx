import { UnreadBadge } from '@shared/ui/unread-badge'
import { fetchSubmissionsUnreadCount } from './api'

interface SubmissionsUnreadBadgeProps {
  className?: string
}

/**
 * Red pill showing unread submission count; hidden when the queue is fully read.
 */
export function SubmissionsUnreadBadge({ className }: SubmissionsUnreadBadgeProps) {
  return (
    <UnreadBadge
      queryKey={['admin', 'lesson-submissions', 'unread-count']}
      queryFn={fetchSubmissionsUnreadCount}
      label="unread submissions"
      className={className}
    />
  )
}
