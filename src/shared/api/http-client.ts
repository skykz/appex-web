import { config } from '@shared/config'

/**
 * Custom error class for API-related errors.
 * Includes HTTP status code and error message from server.
 */
export class ApiError extends Error {
  public status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

/**
 * HTTP client wrapper around fetch with common defaults.
 * Handles authentication token injection, error handling, and JSON parsing.
 *
 * @example
 * const data = await httpClient.get<User>('/users/me')
 * await httpClient.post('/users', { name: 'John' })
 */
export const httpClient = {
  /**
   * Performs a GET request to the API.
   */
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  },

  /**
   * Performs a POST request to the API.
   */
  async post<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  },

  /**
   * Performs a PUT request to the API.
   */
  async put<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  },

  /**
   * Performs a DELETE request to the API.
   */
  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  },

  /**
   * Core request method with error handling and auth token injection.
   */
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${config.apiUrl}${endpoint}`

    // Get auth token from storage if available
    const token = this.getAuthToken()

    const headers = new Headers(options.headers)
    headers.set('Content-Type', 'application/json')

    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const message = await response.text().catch(() => 'Request failed')
      throw new ApiError(response.status, message)
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return undefined as T
    }

    return response.json()
  },

  /**
   * Retrieves the authentication token from memory storage.
   * In a real app, this would use a proper auth store.
   */
  getAuthToken(): string | null {
    // This is a placeholder - in real app, use auth store
    return null
  },

  /**
   * Sets the authentication token in memory storage.
   */
  setAuthToken(token: string | null): void {
    // This is a placeholder - in real app, use auth store
    console.log('Token set:', token)
  },
}
