/**
 * User entity type definition.
 * Represents the core user data model used across the application.
 */
export interface User {
  id: string
  email: string
  name: string
  created_at: string
  /** Optional profile image URL when the API provides it */
  avatar_url?: string | null
}

/**
 * User creation payload.
 */
export interface CreateUserDto {
  email: string
  name: string
  password: string
}

/**
 * Login payload.
 */
export interface LoginDto {
  email: string
  password: string
}

/**
 * Auth response from the server.
 */
export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}
