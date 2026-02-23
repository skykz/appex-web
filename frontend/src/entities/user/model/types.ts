/**
 * User entity type definition.
 * Represents the core user data model used across the application.
 */
export interface User {
  id: string
  email: string
  name: string
  createdAt: string
}

/**
 * User creation payload.
 */
export interface CreateUserDto {
  email: string
  name: string
  password: string
}
