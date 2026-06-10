/** Duration of full content access after a failed renewal payment. */
export const PAYMENT_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000

export type SubscriptionAccessInput = {
  status: string
  payment_failed_at?: string | null
}

/**
 * Returns when the 24h payment grace window ends, or null if not in grace.
 */
export function gracePeriodEndsAt(
  paymentFailedAt: string | null | undefined
): Date | null {
  if (!paymentFailedAt) return null
  return new Date(new Date(paymentFailedAt).getTime() + PAYMENT_GRACE_PERIOD_MS)
}

/**
 * True while a past_due subscription is still inside the 24h grace window.
 */
export function isWithinPaymentGracePeriod(
  paymentFailedAt: string | null | undefined
): boolean {
  if (!paymentFailedAt) return true
  const endsAt = gracePeriodEndsAt(paymentFailedAt)
  return endsAt !== null && Date.now() < endsAt.getTime()
}

/**
 * Central access rule shared by backend gating and frontend UI tier logic.
 */
export function subscriptionGrantsAccess(sub: SubscriptionAccessInput): boolean {
  switch (sub.status) {
    case 'active':
    case 'trialing':
    case 'paused':
      return true
    case 'past_due':
      return isWithinPaymentGracePeriod(sub.payment_failed_at)
    default:
      return false
  }
}

/**
 * True when payment failed but the user still has temporary premium access.
 */
export function isInPaymentGracePeriod(sub: SubscriptionAccessInput): boolean {
  return sub.status === 'past_due' && isWithinPaymentGracePeriod(sub.payment_failed_at)
}

/**
 * True when payment failed and the 24h grace window has elapsed.
 */
export function isPaymentGraceExpired(sub: SubscriptionAccessInput): boolean {
  return sub.status === 'past_due' && !isWithinPaymentGracePeriod(sub.payment_failed_at)
}

/**
 * Formats remaining grace time for UI banners (e.g. "5 hours").
 */
export function formatGraceTimeRemaining(paymentFailedAt: string | null | undefined): string {
  const endsAt = gracePeriodEndsAt(paymentFailedAt)
  if (!endsAt) return '24 hours'

  const ms = endsAt.getTime() - Date.now()
  if (ms <= 0) return '0 minutes'

  const hours = Math.floor(ms / (60 * 60 * 1000))
  const minutes = Math.ceil((ms % (60 * 60 * 1000)) / (60 * 1000))

  if (hours >= 1) {
    return minutes > 0 && hours < 24 ? `${hours}h ${minutes}m` : `${hours} hour${hours === 1 ? '' : 's'}`
  }
  return `${minutes} minute${minutes === 1 ? '' : 's'}`
}
