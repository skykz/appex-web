import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@entities/user'

/**
 * Route guard that redirects unauthenticated users to /auth.
 * Wraps protected route children via <Outlet />.
 */
export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  return <Outlet />
}
