import { config } from '@shared/config'

const TOKEN_KEY = 'appex_admin_access_token'

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
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, headers, ...rest } = options
  const h = new Headers(headers)
  h.set('Content-Type', 'application/json')

  if (auth) {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) h.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(config.apiUrl + endpoint, {
    ...rest,
    headers: h,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return undefined as T

  const text = await res.text()
  const data = text ? (safeJson(text) as unknown) : undefined

  if (!res.ok) {
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
