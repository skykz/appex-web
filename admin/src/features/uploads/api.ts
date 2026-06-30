import { httpClient } from '@shared/api/http-client'

/**
 * Admin uploads for lesson CMS assets (download blocks, etc.).
 */
export const uploadsApi = {
  /**
   * Stores a lesson download file in Supabase Storage and returns its public URL.
   */
  uploadLessonFile(body: {
    fileName: string
    contentType: string
    size: number
    dataBase64: string
  }) {
    return httpClient.post<{ url: string; fileName: string }>('/admin/uploads/lesson-file', body)
  },
}
