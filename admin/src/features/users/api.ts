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
