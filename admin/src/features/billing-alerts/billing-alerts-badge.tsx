import { UnreadBadge } from '@shared/ui/unread-badge'
import { fetchBillingAlertsOpenCount } from './api'

interface BillingAlertsBadgeProps {
  className?: string
}

/**
 * Sidebar count of unresolved billing alerts. These represent customers being
 * billed incorrectly right now, so the badge is deliberately as loud as the
 * support-queue ones.
 */
export function BillingAlertsBadge({ className }: BillingAlertsBadgeProps) {
  return (
    <UnreadBadge
      queryKey={['admin', 'billing-alerts', 'open-count']}
      queryFn={fetchBillingAlertsOpenCount}
      label="unresolved billing alerts"
      className={className}
    />
  )
}
