import { httpClient } from '@shared/api/http-client'

export interface AdminSubscriptionRow {
  id: string
  user_id: string
  email: string
  name: string | null
  plan_name: string
  status: string
  intro_price: number | null
  price: number
  renewal_date: string
  paused_at: string | null
  created_at: string
}

export interface AdminBillingRow {
  id: string
  user_id: string
  email: string
  name: string | null
  amount: number
  description: string
  paid_at: string
  created_at: string
}

export interface AdminBillingListResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

/**
 * Fetches paginated subscriptions joined with user identity fields for the billing overview.
 */
export async function fetchAdminSubscriptions(params: {
  search?: string
  page?: number
  limit?: number
}): Promise<AdminBillingListResponse<AdminSubscriptionRow>> {
  const sp = new URLSearchParams()
  if (params.search?.trim()) sp.set('search', params.search.trim())
  if (params.page != null) sp.set('page', String(params.page))
  if (params.limit != null) sp.set('limit', String(params.limit))
  const q = sp.toString()
  return httpClient.get<AdminBillingListResponse<AdminSubscriptionRow>>(
    `/admin/subscriptions${q ? `?${q}` : ''}`
  )
}

/**
 * Fetches paginated billing_history rows with user identity fields for payment audit.
 */
export async function fetchAdminBillingHistory(params: {
  search?: string
  page?: number
  limit?: number
}): Promise<AdminBillingListResponse<AdminBillingRow>> {
  const sp = new URLSearchParams()
  if (params.search?.trim()) sp.set('search', params.search.trim())
  if (params.page != null) sp.set('page', String(params.page))
  if (params.limit != null) sp.set('limit', String(params.limit))
  const q = sp.toString()
  return httpClient.get<AdminBillingListResponse<AdminBillingRow>>(
    `/admin/billing-history${q ? `?${q}` : ''}`
  )
}
