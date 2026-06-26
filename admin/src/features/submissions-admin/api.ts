import { httpClient } from '@shared/api/http-client'

export interface LessonSubmissionRow {
  id: string
  user_id: string
  user_email: string
  user_name: string
  lesson_id: number
  lesson_label: string
  lesson_title: string
  message: string | null
  attachment_url: string | null
  status: string
  admin_feedback: string | null
  grade: string | null
  read_at: string | null
  created_at: string
}

export interface SubmissionsListResponse {
  items: LessonSubmissionRow[]
  total: number
  page: number
  limit: number
}

/**
 * Loads student homework submissions for moderation (optional lesson filter).
 */
export async function fetchLessonSubmissions(params: {
  page?: number
  limit?: number
  lessonId?: number
  /** When set, narrows to homework queue (`submitted`) or reviewed rows. */
  status?: 'submitted' | 'reviewed'
  unreadOnly?: boolean
}): Promise<SubmissionsListResponse> {
  const sp = new URLSearchParams()
  if (params.page != null) sp.set('page', String(params.page))
  if (params.limit != null) sp.set('limit', String(params.limit))
  if (params.lessonId != null) sp.set('lessonId', String(params.lessonId))
  if (params.status != null) sp.set('status', params.status)
  if (params.unreadOnly) sp.set('unread', '1')
  const q = sp.toString()
  return httpClient.get<SubmissionsListResponse>(
    `/admin/lesson-submissions${q ? `?${q}` : ''}`
  )
}

/**
 * Returns how many submissions are still unread for the sidebar badge.
 */
export async function fetchSubmissionsUnreadCount(): Promise<number> {
  const res = await httpClient.get<{ unread: number }>(
    '/admin/lesson-submissions/unread-count'
  )
  return res.unread
}

/**
 * Marks every unread submission as read.
 */
export async function markAllSubmissionsRead(): Promise<{ updated: number }> {
  return httpClient.post<{ updated: number }>('/admin/lesson-submissions/read-all', {})
}

/**
 * Marks a submission as read or unread.
 */
export async function patchSubmissionRead(id: string, read: boolean): Promise<void> {
  await httpClient.patch(`/admin/lesson-submissions/${id}`, { read })
}

/**
 * Saves staff feedback and optionally marks a submission reviewed.
 */
export async function patchLessonSubmission(
  id: string,
  body: { adminFeedback?: string; grade?: string | null; status?: 'submitted' | 'reviewed' }
): Promise<void> {
  await httpClient.patch(`/admin/lesson-submissions/${id}`, {
    adminFeedback: body.adminFeedback,
    grade: body.grade,
    status: body.status,
  })
}
