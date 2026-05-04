import { httpClient } from '@shared/api/http-client'

export interface ContactMessageRow {
  id: string
  user_id: string
  email: string
  name: string
  subject: string
  message: string
  category: string
  read_at: string | null
  created_at: string
}

export interface ContactListResponse {
  items: ContactMessageRow[]
  total: number
  page: number
  limit: number
}

/**
 * Fetches paginated contact / feedback threads for the admin inbox.
 */
export async function fetchContactMessages(params: {
  page?: number
  limit?: number
  unreadOnly?: boolean
}): Promise<ContactListResponse> {
  const sp = new URLSearchParams()
  if (params.page != null) sp.set('page', String(params.page))
  if (params.limit != null) sp.set('limit', String(params.limit))
  if (params.unreadOnly) sp.set('unread', '1')
  const q = sp.toString()
  return httpClient.get<ContactListResponse>(`/admin/contact-messages${q ? `?${q}` : ''}`)
}

/**
 * Marks a support message as read or unread.
 */
export async function patchContactRead(id: string, read: boolean): Promise<void> {
  await httpClient.patch(`/admin/contact-messages/${id}`, { read })
}
