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

export type { Subscription }

/** Coarse, UI-friendly tier the app uses for gating ("Free" vs paid). */
export type SubscriptionTier = 'free' | 'premium' | 'pending'

export interface SubscriptionSummary {
  /** The subscription row from our DB, or null if the user never subscribed. */
  data: Subscription | null
  isLoading: boolean
  /** Coarse tier — most UI just cares about this. */
  tier: SubscriptionTier
  /** True for any status that grants access (active / trialing / past_due / paused). */
  hasAccess: boolean
  /** True when subscription is scheduled to end at period end (UI shows "Canceled" badge). */
  endingSoon: boolean
  /** Short human-readable plan label for sidebar ("Premium · 4-week", "Free", "Premium · Yearly"). */
  planLabel: string
}

const PAID_STATUSES = ['active', 'trialing', 'past_due', 'paused'] as const

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
    // The summary follows the user around the app — don't refetch on every
    // route change, only when something explicitly invalidates it.
    staleTime: 60_000,
  })

  const sub = data ?? null
  const hasAccess = !!sub && (PAID_STATUSES as readonly string[]).includes(sub.status)
  const isPending = sub?.status === 'incomplete'
  const endingSoon = !!sub && sub.status === 'active' && sub.cancel_at_period_end

  const tier: SubscriptionTier = hasAccess ? 'premium' : isPending ? 'pending' : 'free'

  let planLabel = 'Free plan'
  if (tier === 'premium') {
    const cadence = sub?.billing_interval === 'year' ? 'Yearly' : '4-week'
    planLabel = endingSoon ? `Premium · ${cadence} (ending)` : `Premium · ${cadence}`
  } else if (tier === 'pending') {
    planLabel = 'Verifying payment…'
  }

  return {
    data: sub,
    isLoading,
    tier,
    hasAccess,
    endingSoon,
    planLabel,
  }
}
