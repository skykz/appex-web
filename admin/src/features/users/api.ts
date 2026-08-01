import { httpClient } from '@shared/api/http-client'

export interface AdminUserRow {
  id: string
  email: string
  name: string
  role: string
  created_at: string
  credits: number
  streak_current: number
}

export interface AdminUsersListResponse {
  items: AdminUserRow[]
  total: number
  page: number
  limit: number
}

/**
 * Fetches a paginated, optionally filtered slice of users for the admin directory.
 */
export async function fetchAdminUsers(params: {
  search?: string
  page?: number
  limit?: number
}): Promise<AdminUsersListResponse> {
  const sp = new URLSearchParams()
  if (params.search?.trim()) sp.set('search', params.search.trim())
  if (params.page != null) sp.set('page', String(params.page))
  if (params.limit != null) sp.set('limit', String(params.limit))
  const q = sp.toString()
  return httpClient.get<AdminUsersListResponse>(`/admin/users${q ? `?${q}` : ''}`)
}

/** A funnel quiz submission that never became an account (`user_id IS NULL`). */
export interface AdminLeadRow {
  id: string
  email: string
  name: string
  landing: string
  selected_plan: string | null
  utm_source: string | null
  utm_campaign: string | null
  utm_medium: string | null
  welcome_email_sent_at: string | null
  /** When the lead clicked the emailed confirmation link. NULL = unconfirmed. */
  confirmed_at: string | null
  confirm_email_sent_at: string | null
  created_at: string
}

/** Email-confirmation filter for the leads list. Not the same as having paid. */
export type LeadStatusFilter = 'unconfirmed' | 'confirmed' | 'all'

export interface AdminLeadsListResponse {
  items: AdminLeadRow[]
  total: number
  page: number
  limit: number
  /**
   * Row counts per confirmation state, honouring the same search filter as the
   * list — so the tab badges can never disagree with what the table shows.
   */
  counts: {
    confirmed: number
    unconfirmed: number
  }
}

/**
 * Fetches a paginated, optionally filtered slice of unconfirmed leads — people who
 * submitted the funnel quiz but never paid, so they have no `users` row yet.
 */
export async function fetchAdminLeads(params: {
  search?: string
  status?: LeadStatusFilter
  page?: number
  limit?: number
}): Promise<AdminLeadsListResponse> {
  const sp = new URLSearchParams()
  if (params.search?.trim()) sp.set('search', params.search.trim())
  if (params.status) sp.set('status', params.status)
  if (params.page != null) sp.set('page', String(params.page))
  if (params.limit != null) sp.set('limit', String(params.limit))
  const q = sp.toString()
  return httpClient.get<AdminLeadsListResponse>(`/admin/leads${q ? `?${q}` : ''}`)
}

/**
 * Deletes one unconfirmed/confirmed funnel lead.
 *
 * Irreversible: it removes the learner's quiz answers and confirmation state too.
 * The server refuses to touch leads that converted into a paying account.
 */
export async function deleteAdminLead(id: string): Promise<void> {
  return httpClient.delete<void>(`/admin/leads/${id}`)
}

/**
 * Sends the confirmation email to one lead on demand (admin-triggered).
 *
 * Delivered immediately, bypassing the delay and cooldown the automatic quiz path
 * uses — see the backend handler for why.
 */
export async function resendLeadConfirmEmail(id: string): Promise<{ success: boolean }> {
  return httpClient.post<{ success: boolean }>(`/admin/leads/${id}/resend-confirm`, {})
}
