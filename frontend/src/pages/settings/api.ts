import { httpClient } from '@shared/api'

/** Billing cadence keys returned by GET /subscription/plans and accepted by checkout. */
export type BillingInterval = 'week_1' | 'week_4' | 'year'

/** Mirror of the backend `subscriptions` row, extended with Stripe lifecycle fields. */
export interface Subscription {
  id: string
  plan_name: string
  status:
    | 'active'
    | 'trialing'
    | 'past_due'
    | 'paused'
    | 'canceled'
    | 'incomplete'
    | 'incomplete_expired'
    | 'unpaid'
  intro_price: number | null
  price: number
  currency: string | null
  renewal_date: string | null
  paused_at: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  billing_interval: BillingInterval | null
  cancel_at_period_end: boolean
  current_period_start: string | null
  current_period_end: string | null
  trial_end: string | null
}

/** Mirror of the backend `billing_history` row. */
export interface BillingRecord {
  id: string
  amount: number
  currency: string | null
  description: string
  paid_at: string
  invoice_url: string | null
  invoice_pdf: string | null
  status: string | null
}

/** Public plan summary returned by GET /api/subscription/plans. */
export interface Plan {
  id: BillingInterval
  stripe_price_id: string
  amount: number
  intro_amount: number | null
  currency: string
  interval_label: string
}

export const settingsApi = {
  async listPlans(): Promise<Plan[]> {
    return httpClient.get('/subscription/plans')
  },

  async getSubscription(): Promise<Subscription | null> {
    return httpClient.get('/subscription')
  },

  /** Creates a Stripe Checkout Session and returns the hosted URL the browser should be redirected to. */
  async createCheckoutSession(interval: BillingInterval): Promise<{ url: string }> {
    return httpClient.post('/subscription/checkout', { interval })
  },

  /**
   * Synchronously pulls a finished Checkout Session into our DB. Called on
   * return from Stripe Checkout so the UI never has to wait for the webhook.
   */
  async syncFromSession(sessionId: string): Promise<{ synced: boolean; status?: string }> {
    return httpClient.post('/subscription/sync-from-session', { session_id: sessionId })
  },

  /** Creates a Stripe Customer Portal session and returns the hosted URL to redirect to. */
  async createPortalSession(): Promise<{ url: string }> {
    return httpClient.post('/subscription/portal')
  },

  async pauseSubscription(): Promise<{ success: boolean }> {
    return httpClient.patch('/subscription/pause')
  },

  async resumeSubscription(): Promise<{ success: boolean }> {
    return httpClient.patch('/subscription/resume')
  },

  /** Cancels at end of period — access stays until current_period_end. */
  async cancelSubscription(): Promise<{ success: boolean }> {
    return httpClient.patch('/subscription/cancel')
  },

  /** Undoes a scheduled cancellation. */
  async reactivateSubscription(): Promise<{ success: boolean }> {
    return httpClient.patch('/subscription/reactivate')
  },

  /** Win-back: swap the current sub to the yearly plan with prorations. */
  async switchToYearly(): Promise<{ success: boolean }> {
    return httpClient.patch('/subscription/switch-to-yearly')
  },

  async getBillingHistory(): Promise<BillingRecord[]> {
    return httpClient.get('/billing/history')
  },

  async submitContact(data: {
    subject: string
    message: string
    category?: 'general' | 'bug' | 'billing' | 'content' | 'feedback' | 'other'
  }): Promise<{ success: boolean }> {
    return httpClient.post('/contact', data)
  },
}
