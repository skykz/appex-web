import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@shared/config', () => ({
  config: { apiUrl: 'http://appex.test' },
}))

vi.mock('@shared/session/session-expired', () => ({
  notifySessionExpired: vi.fn(),
}))

describe('httpClient GET retry', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.resetModules()
    vi.useRealTimers()
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
})
