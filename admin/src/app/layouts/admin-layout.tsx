import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FolderTree, BookOpen, Users, LogOut, Zap } from 'lucide-react'
import { cn, signedInDisplayLines } from '@shared/lib'
import { useAdminAuthStore } from '@entities/admin-auth/model/auth-store'
import { Button } from '@shared/ui/button'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/categories', label: 'Categories', icon: FolderTree },
  { to: '/courses', label: 'Courses', icon: BookOpen },
  { to: '/users', label: 'Users', icon: Users },
]

/** Shell with sidebar navigation, session footer, and a centered main column for admin routes. */
export function AdminLayout() {
  const user = useAdminAuthStore((s) => s.user)
  const logout = useAdminAuthStore((s) => s.logout)
  const navigate = useNavigate()

  /** Clears admin session and returns the operator to the login screen. */
  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const sessionLines = signedInDisplayLines(user ?? undefined)

  return (
    <div className="flex min-h-screen">
      <aside className="admin-sidebar-surface flex w-64 shrink-0 flex-col border-r shadow-[4px_0_28px_-14px_rgba(15,23,42,0.1)]">
        <div className="flex h-[4.25rem] items-center border-b border-[hsl(var(--sidebar-border))] px-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm ring-1 ring-orange-600/20">
              <Zap className="size-4" aria-hidden />
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-bold tracking-tight text-[hsl(var(--sidebar-accent-foreground))]">
                AppEx
              </div>
              <div className="text-xs text-muted-foreground">Admin console</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                  isActive
                    ? 'bg-neutral-100/95 font-semibold text-[hsl(var(--sidebar-accent-foreground))] shadow-inner ring-1 ring-orange-200/60'
                    : 'text-muted-foreground hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))]'
                )
              }
            >
              <n.icon className="h-4 w-4 shrink-0" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-[hsl(var(--sidebar-border))] p-4">
          <div
            className="mb-3 rounded-lg bg-[hsl(var(--sidebar-accent))] px-3 py-2 ring-1 ring-orange-100/60"
            aria-label="Signed-in account"
          >
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Signed in
            </div>
            <div className="truncate text-xs font-medium text-[hsl(var(--sidebar-accent-foreground))]">
              {sessionLines.primary}
            </div>
            {sessionLines.secondary ? (
              <div className="truncate pt-0.5 text-[10px] text-muted-foreground">{sessionLines.secondary}</div>
            ) : null}
          </div>
          <Button variant="outline" size="sm" className="w-full border-input bg-background shadow-sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <main className="admin-main-bg flex-1 overflow-auto">
        <div className="mx-auto min-h-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
