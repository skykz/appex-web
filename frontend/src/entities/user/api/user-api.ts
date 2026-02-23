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
}
