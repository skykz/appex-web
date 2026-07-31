import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  LayoutDashboard,
  FolderTree,
  BookOpen,
  Users,
  LogOut,
  Zap,
  Inbox,
  Upload,
  CreditCard,
  Menu,
  X,
  Undo2,
  AlertTriangle,
  TrendingDown,
} from 'lucide-react'
import { cn, signedInDisplayLines } from '@shared/lib'
import { useAdminAuthStore } from '@entities/admin-auth/model/auth-store'
import { CommandPalette } from '@features/command-palette/command-palette'
import { BillingAlertsBadge } from '@features/billing-alerts/billing-alerts-badge'
import { InboxUnreadBadge } from '@features/inbox/inbox-unread-badge'
import { SubmissionsUnreadBadge } from '@features/submissions-admin/submissions-unread-badge'
import { setSessionExpiredHandler } from '@shared/session/session-expired'
import { Button } from '@shared/ui/button'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/categories', label: 'Categories', icon: FolderTree },
  { to: '/funnel', label: 'Funnel', icon: TrendingDown },
  { to: '/courses', label: 'Courses', icon: BookOpen },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/billing', label: 'Billing', icon: CreditCard },
  { to: '/refunds', label: 'Refunds', icon: Undo2 },
  { to: '/billing-alerts', label: 'Billing alerts', icon: AlertTriangle },
  { to: '/support', label: 'Inbox', icon: Inbox },
  { to: '/submissions', label: 'Submissions', icon: Upload },
]

/** Shell with sidebar navigation, session footer, and a centered main column for admin routes. */
export function AdminLayout() {
  const user = useAdminAuthStore((s) => s.user)
  const logout = useAdminAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  /**
   * Registers global 401 handling: clears persisted auth, drops React Query cache, and sends the operator to login with return path.
   */
  useEffect(() => {
    setSessionExpiredHandler(() => {
      logout()
      queryClient.clear()
      const from = `${window.location.pathname}${window.location.search}`
      navigate('/login?session=expired', { replace: true, state: { from } })
      toast.info('Session expired. Please sign in again.')
    })
    return () => setSessionExpiredHandler(null)
  }, [logout, navigate, queryClient])

  /** Close the mobile drawer on Escape for keyboard users. */
  useEffect(() => {
    if (!mobileNavOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileNavOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileNavOpen])

  /** Clears admin session and returns the operator to the login screen. */
  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const sessionLines = signedInDisplayLines(user ?? undefined)

  return (
    <div className="flex min-h-screen">
      <CommandPalette />

      {/* Mobile backdrop — click to dismiss the drawer */}
      {mobileNavOpen ? (
        <div
          className="fixed inset-0 z-40 bg-neutral-950/40 backdrop-blur-sm lg:hidden"
          aria-hidden
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          'admin-sidebar-surface flex w-64 shrink-0 flex-col border-r shadow-[4px_0_28px_-14px_rgba(15,23,42,0.1)]',
          // Off-canvas drawer below lg; static in-flow sidebar at lg and up.
          'fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0 lg:transition-none',
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-[4.25rem] items-center justify-between border-b border-[hsl(var(--sidebar-border))] px-5">
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
          <button
            type="button"
            className="-mr-2 flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation menu"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              onClick={() => setMobileNavOpen(false)}
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
              {n.to === '/billing-alerts' ? <BillingAlertsBadge /> : null}
              {n.to === '/support' ? <InboxUnreadBadge /> : null}
              {n.to === '/submissions' ? <SubmissionsUnreadBadge /> : null}
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
      <main className="admin-main-bg flex min-w-0 flex-1 flex-col overflow-auto">
        {/* Mobile top bar — hamburger + brand, hidden at lg where the sidebar is always visible */}
        <div className="admin-sidebar-surface sticky top-0 z-30 flex h-[4.25rem] items-center gap-3 border-b px-4 lg:hidden">
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileNavOpen}
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-orange-500 text-white shadow-sm ring-1 ring-orange-600/20">
              <Zap className="size-4" aria-hidden />
            </div>
            <span className="text-sm font-bold tracking-tight text-[hsl(var(--sidebar-accent-foreground))]">
              AppEx
            </span>
          </div>
        </div>
        <div className="mx-auto min-h-full w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
