/**
 * Cross-cutting subscription state for the app shell.
 *
 * Why this lives in `entities/subscription` rather than `pages/settings`:
 * sidebar, header, and home page all need to know "is this user Premium?"
 * to gate UI affordances. Keeping it in a settings page would cause circular
 * imports from widgets. The settings page still owns its own page-specific
 * api in `pages/settings/api.ts`; this hook reuses the same query key so
 * invalidations there (after checkout, cancel, etc.) propagate everywhere.
 */
import { useQuery } from '@tanstack/react-query'
import { settingsApi, type Subscription } from '@pages/settings/api'
import {
  subscriptionGrantsAccess,
  isInPaymentGracePeriod,
  isPaymentGraceExpired,
} from '@shared/lib'

export type { Subscription }

/** Coarse, UI-friendly tier the app uses for gating ("Free" vs paid). */
export type SubscriptionTier = 'free' | 'premium' | 'pending'

export interface SubscriptionSummary {
  /** The subscription row from our DB, or null if the user never subscribed. */
  data: Subscription | null
  isLoading: boolean
  /** Coarse tier — most UI just cares about this. */
  tier: SubscriptionTier
  /** True when the user can access premium content right now. */
  hasAccess: boolean
  /** True when payment failed but the 24h grace window is still active. */
  inPaymentGrace: boolean
  /** True when payment failed and grace has elapsed — content is locked. */
  paymentGraceExpired: boolean
  /** True when subscription is scheduled to end at period end (UI shows "Canceled" badge). */
  endingSoon: boolean
  /** Short human-readable plan label for sidebar ("Premium · 4-week", "Free", "Premium · Yearly"). */
  planLabel: string
}

/**
 * Single source of truth for "what tier is the current user?" Reused by
 * sidebar header, profile dropdown badge, and the upgrade CTA. Shares the
 * ['subscription'] query key with the settings page so invalidations there
 * (after checkout, cancel, etc.) refresh every consumer at once.
 */
export function useSubscriptionSummary(): SubscriptionSummary {
  const { data, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => settingsApi.getSubscription(),
    staleTime: 60_000,
  })

  const sub = data ?? null
  const hasAccess = !!sub && subscriptionGrantsAccess(sub)
  const inPaymentGrace = !!sub && isInPaymentGracePeriod(sub)
  const paymentGraceExpired = !!sub && isPaymentGraceExpired(sub)
  const isPending = sub?.status === 'incomplete'
  const endingSoon = !!sub && sub.status === 'active' && sub.cancel_at_period_end

  const tier: SubscriptionTier = hasAccess ? 'premium' : isPending ? 'pending' : 'free'

  let planLabel = 'Free plan'
  if (tier === 'premium') {
    const cadence =
      sub?.billing_interval === 'year'
        ? 'Yearly'
        : sub?.billing_interval === 'week_1'
          ? '1-week'
          : '4-week'
    if (inPaymentGrace) {
      planLabel = `Premium · ${cadence} (payment issue)`
    } else {
      planLabel = endingSoon ? `Premium · ${cadence} (ending)` : `Premium · ${cadence}`
    }
  } else if (paymentGraceExpired) {
    planLabel = 'Access locked — payment failed'
  } else if (isPending) {
    planLabel = 'Verifying payment…'
  }

  return {
    data: sub,
    isLoading,
    tier,
    hasAccess,
    inPaymentGrace,
    paymentGraceExpired,
    endingSoon,
    planLabel,
  }
}
