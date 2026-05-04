import { httpClient } from '@shared/api/http-client'
import type { AdminAuthResponse } from '../model/types'

export const adminAuthApi = {
  login: (email: string, password: string) =>
    httpClient.post<AdminAuthResponse>('/admin/auth/login', { email, password }, { auth: false }),

  /**
   * Sends a password reset email; redirect targets the admin SPA when `ADMIN_APP_PUBLIC_URL` is set on the API.
   */
  forgotPassword: (email: string) =>
    httpClient.post<{ ok: boolean; message: string }>(
      '/auth/forgot-password',
      { email, intent: 'admin' },
      { auth: false }
    ),

  /**
   * Sets a new password from the recovery link token (URL hash).
   */
  recoverPassword: (data: { accessToken: string; newPassword: string }) =>
    httpClient.post<{ success: boolean }>('/auth/recover-password', data, { auth: false }),
}
