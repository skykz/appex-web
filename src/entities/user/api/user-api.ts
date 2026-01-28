import { httpClient } from '@shared/api'
import type { User, CreateUserDto } from '../model/types'

/**
 * User entity API methods.
 * Centralized API calls for user-related operations.
 */
export const userApi = {
  /**
   * Fetches the current authenticated user.
   */
  async getCurrentUser(): Promise<User> {
    return httpClient.get<User>('/users/me')
  },

  /**
   * Fetches a user by ID.
   */
  async getUserById(id: string): Promise<User> {
    return httpClient.get<User>(`/users/${id}`)
  },

  /**
   * Creates a new user.
   */
  async createUser(data: CreateUserDto): Promise<User> {
    return httpClient.post<User>('/users', data)
  },

  /**
   * Updates the current user's profile.
   */
  async updateProfile(data: Partial<Pick<User, 'name'>>): Promise<User> {
    return httpClient.put<User>('/users/me', data)
  },
}
