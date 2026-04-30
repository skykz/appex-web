/**
 * Resolves the browser-facing API base URL (no trailing slash).
 * Production builds must set `VITE_API_URL` on the host (e.g. Vercel); otherwise the bundle would keep calling localhost.
 */
function resolveApiUrl(): string {
  const raw = import.meta.env.VITE_API_URL?.trim()
  if (raw) return raw.replace(/\/$/, '')
  if (import.meta.env.DEV) return 'http://localhost:3000/api'
  throw new Error(
    'VITE_API_URL is missing. In Vercel → Admin project → Settings → Environment Variables, set VITE_API_URL to your deployed backend origin + /api (e.g. https://appex-web-backend.vercel.app/api), then redeploy. Add this admin site URL to backend CORS_ORIGINS.'
  )
}

export const config = {
  apiUrl: resolveApiUrl(),
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const
