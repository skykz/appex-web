/** Minimum time before period end when a user may still cancel (24 hours). */
export const CANCEL_DEADLINE_MS = 24 * 60 * 60 * 1000

/** Renewal reminder lead times. */
export const RENEWAL_REMINDER_3_DAYS = 3
export const RENEWAL_REMINDER_24H_MS = 24 * 60 * 60 * 1000

/** Window around the 24h-before-renewal target for hourly cron matching. */
export const RENEWAL_24H_CRON_WINDOW_MS = 60 * 60 * 1000
