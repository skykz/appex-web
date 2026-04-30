export interface SessionUserLike {
  email: string
  name?: string | null
}

/**
 * Returns a non-reversible-ish email preview for sidebars and screenshots (local part mostly hidden).
 */
export function maskEmail(email: string): string {
  const t = email.trim().toLowerCase()
  if (!t) return '—'
  const at = t.indexOf('@')
  if (at < 1) return '••••'
  const local = t.slice(0, at)
  const domain = t.slice(at + 1)
  if (!domain) return '••••'
  const first = local[0] ?? '•'
  const localMask = `${first}•••`
  const lastDot = domain.lastIndexOf('.')
  const domLabel = lastDot > 0 ? domain.slice(0, lastDot) : domain
  const tld = lastDot > 0 ? domain.slice(lastDot) : ''
  const domMask = domLabel.length <= 1 ? `••${tld}` : `${domLabel.slice(0, 2)}••${tld}`
  return `${localMask}@${domMask}`
}

/**
 * Builds one or two lines for the signed-in operator block: prefers profile name, always avoids raw email in the primary line when a name exists.
 */
export function signedInDisplayLines(user: SessionUserLike | null | undefined): {
  primary: string
  secondary?: string
} {
  if (!user?.email?.trim()) return { primary: '—' }
  const masked = maskEmail(user.email)
  const name = user.name?.trim()
  if (name) return { primary: name, secondary: masked }
  return { primary: masked }
}
