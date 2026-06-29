import type { AdminAuthResponse } from '@entities/admin-auth/model/types'
import { config } from '@shared/config'
import { notifySessionExpired } from '@shared/session/session-expired'

const TOKEN_KEY = 'appex_admin_access_token'
const REFRESH_TOKEN_KEY = 'appex_admin_refresh_token'

/** Single-flight refresh so parallel 401s do not race multiple `/auth/refresh` calls. */
let refreshInFlight: Promise<boolean> | null = null

/**
 * Exchanges a stored admin refresh token for new access/refresh tokens in localStorage.
 * @returns true when a new access token is available; false if refresh is impossible or failed.
 */
async function tryRefreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
      if (!refreshToken) return false

      const response = await fetch(`${config.apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!response.ok) return false

      const data = (await response.json()) as AdminAuthResponse
      localStorage.setItem(TOKEN_KEY, data.accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
      return true
    } catch {
      return false
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

/** GET-only: transient upstream / rate-limit responses worth a short backoff retry. */
function shouldRetryIdempotentGet(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Performs `fetch` with optional limited retries for idempotent GETs (network blips / 503 bursts).
 * Does not retry 401 — global session handling runs after the final response.
 */
async function fetchWithGetRetry(url: string, init: RequestInit, enableGetRetry: boolean): Promise<Response> {
  const max = enableGetRetry ? 3 : 1
  const backoffMs = [300, 800]
  let lastErr: unknown
  for (let attempt = 0; attempt < max; attempt++) {
    try {
      const res = await fetch(url, init)
      if (res.status === 401 || !enableGetRetry || attempt === max - 1) return res
      if (shouldRetryIdempotentGet(res.status)) {
        await delay(backoffMs[attempt] ?? 800)
        continue
      }
      return res
    } catch (e) {
      lastErr = e
      if (!enableGetRetry || attempt === max - 1) throw e
      await delay(backoffMs[attempt] ?? 800)
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Request failed after retries')
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  auth?: boolean
  /** When true (default for GET), retries a few times on transient failures. */
  retryableGet?: boolean
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, headers, retryableGet, ...rest } = options
  const method = (rest.method ?? 'GET').toString().toUpperCase()
  const enableGetRetry = method === 'GET' && retryableGet !== false

  /** Builds request headers with the latest access token from localStorage. */
  function buildHeaders(): Headers {
    const h = new Headers(headers)
    h.set('Content-Type', 'application/json')
    if (auth) {
      const token = localStorage.getItem(TOKEN_KEY)
      if (token) h.set('Authorization', `Bearer ${token}`)
    }
    return h
  }

  const fetchInit = (): RequestInit => ({
    ...rest,
    method,
    headers: buildHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  let res = await fetchWithGetRetry(config.apiUrl + endpoint, fetchInit(), enableGetRetry)

  if (res.status === 401 && auth && localStorage.getItem(REFRESH_TOKEN_KEY)) {
    const refreshed = await tryRefreshSession()
    if (refreshed) {
      res = await fetchWithGetRetry(config.apiUrl + endpoint, fetchInit(), enableGetRetry)
    }
  }

  if (res.status === 204) return undefined as T

  const text = await res.text()
  const data = text ? (safeJson(text) as unknown) : undefined

  if (!res.ok) {
    // Session invalid after optional refresh: clear + redirect + toast (see session-expired).
    if (res.status === 401 && auth) {
      notifySessionExpired()
    }
    const message =
      (data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : res.statusText) || 'Request failed'
    throw new ApiError(res.status, message, data)
  }

  return data as T
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export const httpClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'POST', body }),
  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'PUT', body }),
  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'PATCH', body }),
  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
}

export const ADMIN_TOKEN_KEY = TOKEN_KEY
export const ADMIN_REFRESH_TOKEN_KEY = REFRESH_TOKEN_KEY
