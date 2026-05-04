import { httpClient } from '@shared/api'

export interface Subscription {
  id: string
  plan_name: string
  status: 'active' | 'paused' | 'cancelled'
  intro_price: number | null
  price: number
  renewal_date: string
  paused_at: string | null
}

export interface BillingRecord {
  id: string
  amount: number
  description: string
  paid_at: string
}

export const settingsApi = {
  async getSubscription(): Promise<Subscription | null> {
    return httpClient.get('/subscription')
  },

  async pauseSubscription(): Promise<Subscription> {
    return httpClient.patch('/subscription/pause')
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
