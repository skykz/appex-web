/**
 * Allowed in-app paths after login (prefix match for nested routes like /courses/12).
 * Rejects open redirects (//, .., http:, etc.).
 */
const ALLOWED_PREFIXES = [
  '/dashboard',
  '/categories',
  '/courses',
  '/users',
  '/billing',
  '/refunds',
  '/billing-alerts',
  '/support',
  '/submissions',
] as const

/**
 * Returns pathname + optional query/hash from a string, or just pathname if combined.
 */
function pathOnly(from: string): string {
  const noHash = from.split('#')[0] ?? ''
  const q = noHash.indexOf('?')
  return q === -1 ? noHash : noHash.slice(0, q)
}

/**
 * Resolves `location.state.from` (or similar) to a safe internal path for post-login navigation.
 */
export function getSafeReturnPath(from: unknown, fallback = '/dashboard'): string {
  if (typeof from !== 'string' || !from.startsWith('/')) return fallback
  if (from.startsWith('//') || from.includes('://')) return fallback
  if (from.includes('..')) return fallback

  const base = pathOnly(from)
  const ok = ALLOWED_PREFIXES.some((p) => base === p || base.startsWith(`${p}/`))
  if (!ok) return fallback

  return from
}
