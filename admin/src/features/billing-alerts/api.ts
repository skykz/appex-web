import { httpClient } from '@shared/api/http-client'

export type BillingAlertStatusFilter = 'open' | 'resolved' | 'all'

export interface BillingAlertRow {
  id: string
  alert_type: string
  user_id: string | null
  email: string | null
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  stripe_checkout_session_id: string | null
  detail: string | null
  context: Record<string, unknown>
  resolved_at: string | null
  resolved_note: string | null
  created_at: string
}

export interface BillingAlertListResponse {
  items: BillingAlertRow[]
  total: number
  page: number
  limit: number
}

/**
 * Lists billing alerts; defaults server-side to the unresolved queue.
 */
export async function fetchBillingAlerts(params: {
  status?: BillingAlertStatusFilter
  page?: number
  limit?: number
}): Promise<BillingAlertListResponse> {
  const sp = new URLSearchParams()
  if (params.status) sp.set('status', params.status)
  if (params.page != null) sp.set('page', String(params.page))
  if (params.limit != null) sp.set('limit', String(params.limit))
  const q = sp.toString()
  return httpClient.get<BillingAlertListResponse>(`/admin/billing-alerts${q ? `?${q}` : ''}`)
}

/**
 * Returns the count of unresolved alerts for the sidebar badge.
 */
export async function fetchBillingAlertsOpenCount(): Promise<number> {
  const res = await httpClient.get<{ open: number }>('/admin/billing-alerts/open-count')
  return res.open
}

/**
 * Marks an alert resolved with an optional note, or reopens it.
 */
export async function patchBillingAlert(
  id: string,
  args: { resolved: boolean; note?: string }
): Promise<void> {
  await httpClient.patch(`/admin/billing-alerts/${id}`, args)
}
