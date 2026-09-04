import { useAuthStore } from '@entities/user/model/auth-store'
import type { AuthResponse } from '@entities/user/model/types'
import { config } from '@shared/config'

const TOKEN_KEY = 'appex_access_token'
const REFRESH_TOKEN_KEY = 'appex_refresh_token'

/** Single-flight refresh so parallel 401s do not race multiple `/auth/refresh` calls. */
let refreshInFlight: Promise<boolean> | null = null

/**
 * Exchanges a stored refresh token for new access/refresh tokens and updates localStorage + auth store.
 * @returns true when a new access token is available; false if refresh is impossible or failed.
 */
async function tryRefreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
      if (!refreshToken) return false

      const url = `${config.apiUrl}/auth/refresh`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!response.ok) return false

      const data = (await response.json()) as AuthResponse
      localStorage.setItem(TOKEN_KEY, data.accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
      useAuthStore.getState().setAuth(
        data.user,
        data.accessToken,
        data.refreshToken
      )
      return true
    } catch {
      return false
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

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
 * Extracts a human-readable message from JSON API error bodies like `{ "error": "..." }`.
 */
function messageFromErrorBody(text: string): string {
  const trimmed = text.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return text
  }
  try {
    const j = JSON.parse(trimmed) as Record<string, unknown>
    if (typeof j.error === 'string') return j.error
    if (typeof j.message === 'string') return j.message
  } catch {
    /* keep raw text */
  }
  return text
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
   * Performs a PATCH request to the API.
   */
  async patch<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
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

    function buildHeaders(): Headers {
      const headers = new Headers(options.headers)
      headers.set('Content-Type', 'application/json')
      const token = localStorage.getItem(TOKEN_KEY)
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }
      return headers
    }

    let response = await fetch(url, {
      ...options,
      headers: buildHeaders(),
    })

    if (
      response.status === 401 &&
      localStorage.getItem(REFRESH_TOKEN_KEY)
    ) {
      const refreshed = await tryRefreshSession()
      if (refreshed) {
        response = await fetch(url, {
          ...options,
          headers: buildHeaders(),
        })
      }
    }

    if (!response.ok) {
      // A refresh token can be revoked or expire while the app is open. Clear
      // the stale session after the final failed request so protected screens
      // do not keep issuing 401 requests with an unusable access token.
      if (response.status === 401) {
        useAuthStore.getState().logout()
      }
      const raw = await response.text().catch(() => 'Request failed')
      throw new ApiError(response.status, messageFromErrorBody(raw))
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return undefined as T
    }

    return response.json()
  },
}
