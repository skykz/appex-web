import { httpClient } from '@shared/api'
import type { User, CreateUserDto, LoginDto, AuthResponse } from '../model/types'

export const userApi = {
  async login(data: LoginDto): Promise<AuthResponse> {
    return httpClient.post<AuthResponse>('/auth/login', data)
  },

  async createUser(data: CreateUserDto): Promise<AuthResponse> {
    return httpClient.post<AuthResponse>('/auth/signup', data)
  },

  async getCurrentUser(): Promise<User> {
    return httpClient.get<User>('/users/me')
  },

  async getUserById(id: string): Promise<User> {
    return httpClient.get<User>(`/users/${id}`)
  },

  async updateProfile(data: Partial<Pick<User, 'name'>>): Promise<User> {
    return httpClient.put<User>('/users/me', data)
  },

  async changePassword(data: {
    currentPassword: string
    newPassword: string
  }): Promise<{ success: boolean }> {
    return httpClient.patch<{ success: boolean }>('/users/me/password', data)
  },

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    return httpClient.post<AuthResponse>('/auth/refresh', { refreshToken })
  },

  /**
   * Triggers a Supabase recovery email; always succeeds with a generic message (no email enumeration).
   */
  async forgotPassword(email: string): Promise<{ ok: boolean; message: string }> {
    return httpClient.post<{ ok: boolean; message: string }>(
      '/auth/forgot-password',
      { email, intent: 'app' }
    )
  },

  /**
   * Sets a new password using the access token from the recovery link (URL hash).
   */
  async recoverPassword(data: {
    accessToken: string
    newPassword: string
  }): Promise<{ success: boolean }> {
    return httpClient.post<{ success: boolean }>('/auth/recover-password', data)
  },
}
