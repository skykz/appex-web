import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAdminAuthStore } from '@entities/admin-auth/model/auth-store'

export function ProtectedRoute() {
  const isAuthenticated = useAdminAuthStore((s) => s.isAuthenticated)
  const location = useLocation()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
