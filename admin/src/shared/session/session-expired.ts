type SessionExpiredHandler = () => void

let handler: SessionExpiredHandler | null = null
let dispatched = false

/**
 * Registers the callback that runs when an authenticated API call returns 401 (expired / invalid JWT).
 */
export function setSessionExpiredHandler(fn: SessionExpiredHandler | null): void {
  handler = fn
}

/**
 * Invoked from the HTTP client once per burst when the session is no longer valid.
 */
export function notifySessionExpired(): void {
  if (dispatched) return
  dispatched = true
  try {
    handler?.()
  } finally {
    globalThis.setTimeout(() => {
      dispatched = false
    }, 2000)
  }
}
