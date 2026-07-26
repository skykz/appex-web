/**
 * Express mounts the API under `/api`. If `VITE_API_URL` is the deployment host only, append `/api`.
 */
function normalizeApiBase(trimmed: string): string {
  const base = trimmed.replace(/\/+$/, '')
  if (base.endsWith('/api')) return base
  try {
    const withScheme = /^https?:\/\//i.test(base) ? base : `https://${base}`
    const u = new URL(withScheme)
    const path = (u.pathname || '/').replace(/\/$/, '') || '/'
    if (path === '/') return `${u.origin}/api`
  } catch {
    /* keep base if URL is invalid */
  }
  return base
}

/**
 * Resolves the browser-facing API base URL (no trailing slash).
 * Production builds must set `VITE_API_URL` on the host (e.g. Vercel); otherwise the bundle would keep calling localhost.
 */
function resolveApiUrl(): string {
  const raw = import.meta.env.VITE_API_URL?.trim()
  if (raw) return normalizeApiBase(raw)
  if (import.meta.env.DEV) return 'http://localhost:3000/api'
  throw new Error(
    'VITE_API_URL is missing. In Vercel → Frontend project → Environment Variables, set VITE_API_URL to your backend URL (origin or …/api), then redeploy.'
  )
}

/**
 * Environment configuration with type-safe access to environment variables.
 * Centralizes all env variable access for easier management.
 */
export const config = {
  apiUrl: resolveApiUrl(),
  /** Public URL of the React app (e.g. https://app.appexme.com). Optional; marketing landings are separate. */
  appOrigin: import.meta.env.VITE_APP_ORIGIN || '',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const
