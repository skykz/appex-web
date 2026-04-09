/**
 * Returns an in-app path safe to use after login/signup (blocks open redirects).
 * Only allows same-origin style paths: starts with one "/", no protocol, no "//".
 */
export function getSafeInternalPath(
  next: string | null | undefined
): string | null {
  if (next == null || typeof next !== 'string') return null
  const t = next.trim()
  if (!t.startsWith('/') || t.startsWith('//')) return null
  if (t.includes('://') || t.includes('\\')) return null
  if (t.length > 512) return null
  return t
}
