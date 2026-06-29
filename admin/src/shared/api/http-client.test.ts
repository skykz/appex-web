import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@shared/config', () => ({
  config: { apiUrl: 'http://appex.test' },
}))

const notifySessionExpired = vi.fn()
vi.mock('@shared/session/session-expired', () => ({
  notifySessionExpired,
}))

describe('httpClient GET retry', () => {
  const originalFetch = globalThis.fetch
  const storage = new Map<string, string>()

  beforeEach(() => {
    notifySessionExpired.mockClear()
    storage.clear()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => {
        storage.set(k, v)
      },
      removeItem: (k: string) => {
        storage.delete(k)
      },
    })
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.resetModules()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  /**
   * Verifies idempotent GETs retry on 503 then succeed (helps flaky Supabase / edge).
   */
  it('retries GET on 503 then returns JSON body', async () => {
    vi.useFakeTimers()
    let n = 0
    globalThis.fetch = vi.fn(async () => {
      n += 1
      if (n < 3) {
        return new Response('upstream', { status: 503 })
      }
      return new Response(JSON.stringify({ hello: 'world' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }) as typeof fetch

    const { httpClient } = await import('./http-client')
    const p = httpClient.get<{ hello: string }>('/admin/ping', { auth: false })
    await vi.advanceTimersByTimeAsync(2000)
    const data = await p
    expect(data.hello).toBe('world')
    expect(n).toBe(3)
  })

  /**
   * Mutations must not use GET retry semantics (avoid duplicate writes).
   */
  it('does not retry POST on 503', async () => {
    let n = 0
    globalThis.fetch = vi.fn(async () => {
      n += 1
      return new Response('no', { status: 503 })
    }) as typeof fetch

    const { httpClient, ApiError } = await import('./http-client')
    await expect(
      httpClient.post('/admin/x', {}, { auth: false })
    ).rejects.toThrow(ApiError)
    expect(n).toBe(1)
  })

  /**
   * On 401 with a refresh token, retries once after `/auth/refresh` and does not log the user out.
   */
  it('refreshes session on 401 then retries the original request', async () => {
    storage.set('appex_admin_access_token', 'expired')
    storage.set('appex_admin_refresh_token', 'valid-refresh')

    let lessonCalls = 0
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/auth/refresh')) {
        return new Response(
          JSON.stringify({
            accessToken: 'new-access',
            refreshToken: 'new-refresh',
            user: { id: '1', email: 'a@b.c', name: 'Admin', role: 'admin' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      if (url.endsWith('/admin/lesson')) {
        lessonCalls += 1
        const auth = new Headers(init?.headers).get('Authorization')
        if (lessonCalls === 1) {
          expect(auth).toBe('Bearer expired')
          return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        expect(auth).toBe('Bearer new-access')
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response('not found', { status: 404 })
    }) as typeof fetch

    const { httpClient } = await import('./http-client')
    const data = await httpClient.put<{ ok: boolean }>('/admin/lesson', { title: 'x' })
    expect(data.ok).toBe(true)
    expect(lessonCalls).toBe(2)
    expect(storage.get('appex_admin_access_token')).toBe('new-access')
    expect(storage.get('appex_admin_refresh_token')).toBe('new-refresh')
    expect(notifySessionExpired).not.toHaveBeenCalled()
  })

  /**
   * When refresh fails, falls back to session-expired handling.
   */
  it('notifies session expired when refresh fails after 401', async () => {
    storage.set('appex_admin_access_token', 'expired')
    storage.set('appex_admin_refresh_token', 'bad-refresh')

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/auth/refresh')) {
        return new Response(JSON.stringify({ error: 'Invalid refresh token' }), { status: 401 })
      }
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }) as typeof fetch

    const { httpClient, ApiError } = await import('./http-client')
    await expect(httpClient.get('/admin/ping')).rejects.toThrow(ApiError)
    expect(notifySessionExpired).toHaveBeenCalledTimes(1)
  })
})
