import { afterEach, describe, expect, it, vi } from 'vitest'
import { notifySessionExpired, setSessionExpiredHandler } from './session-expired'

describe('notifySessionExpired', () => {
  afterEach(() => {
    setSessionExpiredHandler(null)
    vi.useRealTimers()
  })

  /**
   * Ensures parallel 401s only run the logout/redirect path once until the cooldown elapses.
   */
  it('dedupes handler within the cooldown window', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    setSessionExpiredHandler(fn)
    notifySessionExpired()
    notifySessionExpired()
    expect(fn).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(2100)
    notifySessionExpired()
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
