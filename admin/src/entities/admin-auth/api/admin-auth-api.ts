import { httpClient } from '@shared/api/http-client'
import type { AdminAuthResponse } from '../model/types'

export const adminAuthApi = {
  login: (email: string, password: string) =>
    httpClient.post<AdminAuthResponse>('/admin/auth/login', { email, password }, { auth: false }),
}
