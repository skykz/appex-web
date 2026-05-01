/**
 * Express mounts the API under `/api`. If `VITE_API_URL` is set to the deployment origin only
 * (e.g. `https://appex-web-backend-taupe.vercel.app`), requests would hit `/admin/...` and return 404.
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
    'VITE_API_URL is missing. In Vercel → Admin project → Settings → Environment Variables, set VITE_API_URL to your deployed backend (e.g. https://appex-web-backend-taupe.vercel.app or …/api), then redeploy. Add this admin site URL to backend CORS_ORIGINS.'
  )
}

export const config = {
  apiUrl: resolveApiUrl(),
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const
