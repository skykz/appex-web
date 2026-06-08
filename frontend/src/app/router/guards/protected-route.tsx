import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@entities/user'

/**
 * Route guard that redirects unauthenticated users to /auth.
 * Preserves the full path + query (e.g. Stripe checkout return on /settings)
 * so login can send the user back to complete subscription sync.
 */
export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`
    return (
      <Navigate
        to={`/auth?next=${encodeURIComponent(returnTo)}`}
        replace
      />
    )
  }

  return <Outlet />
}
