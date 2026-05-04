import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAdminAuthStore } from '@entities/admin-auth/model/auth-store'

/** Wraps admin routes: redirects anonymous visitors to login while preserving return path (pathname + search). */
export function ProtectedRoute() {
  const isAuthenticated = useAdminAuthStore((s) => s.isAuthenticated)
  const location = useLocation()
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }
  return <Outlet />
}
