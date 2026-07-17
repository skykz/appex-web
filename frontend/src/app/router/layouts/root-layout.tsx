import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { SidebarProvider, SidebarInset, SidebarTrigger, PageLoader, Logo } from '@shared/ui'
import { useCurrentUser } from '@entities/user'
import { AppSidebar } from '@/widgets/app-sidebar'
import { MobileBottomBar } from '@/widgets/mobile-bottom-bar'

/**
 * Root layout component with sidebar navigation.
 * Wraps all authenticated pages with collapsible sidebar and main content area.
 * Suspense boundary handles lazy-loaded route components.
 */
export function RootLayout() {
  /** Loads `/users/me` into the auth store so the sidebar shows real name and email. */
  useCurrentUser()

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset>
        {/* Mobile header with glassmorphism and animations */}
        <header className="lg:hidden sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-sidebar-border bg-background/95 backdrop-blur-sm px-4 supports-backdrop-filter:bg-background/80 transition-shadow duration-200">
          <div className="active:scale-95 transition-transform duration-100">
            <SidebarTrigger />
          </div>

          {/* App branding with subtle animation */}
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-500">
            <Logo className="text-lg" />
          </div>

          {/* Spacer for potential right-side actions */}
          <div className="flex-1" />
          
          {/* Optional: Add notification badge or user avatar here */}
        </header>

        {/* Main content area with suspense fallback */}
        <div className="flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
          <Suspense
            fallback={<PageLoader />}
          >
            <Outlet />
          </Suspense>
        </div>

        {/* Mobile bottom navigation */}
        <MobileBottomBar />
      </SidebarInset>
    </SidebarProvider>
  )
}
