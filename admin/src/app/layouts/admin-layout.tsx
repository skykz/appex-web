import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FolderTree, BookOpen, Users, LogOut } from 'lucide-react'
import { cn } from '@shared/lib'
import { useAdminAuthStore } from '@entities/admin-auth/model/auth-store'
import { Button } from '@shared/ui/button'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/categories', label: 'Categories', icon: FolderTree },
  { to: '/courses', label: 'Courses', icon: BookOpen },
  { to: '/users', label: 'Users', icon: Users },
]

export function AdminLayout() {
  const user = useAdminAuthStore((s) => s.user)
  const logout = useAdminAuthStore((s) => s.logout)
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="flex w-60 shrink-0 flex-col border-r bg-card">
        <div className="flex h-16 items-center px-6 text-lg font-bold">
          AppEx <span className="ml-1.5 rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">Admin</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-primary text-primary-foreground' : 'text-foreground/70 hover:bg-muted hover:text-foreground'
                )
              }
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t p-4">
          <div className="mb-2 truncate text-xs text-muted-foreground">{user?.email}</div>
          <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
