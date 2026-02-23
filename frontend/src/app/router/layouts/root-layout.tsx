import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@shared/ui'
import { AppSidebar } from '@/widgets/app-sidebar'
import { MobileBottomBar } from '@/widgets/mobile-bottom-bar'
import { SupportChat } from '@/widgets/support-chat'

/**
 * Root layout component with sidebar navigation.
 * Wraps all authenticated pages with collapsible sidebar and main content area.
 * Suspense boundary handles lazy-loaded route components.
 */
export function RootLayout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset>
        {/* Mobile header with glassmorphism and animations */}
        <header className="lg:hidden sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-sidebar-border bg-background/95 backdrop-blur-sm px-4 supports-backdrop-filter:bg-background/80 transition-shadow duration-200">
          {/* Sidebar trigger (mobile): lets users open the sidebar when it’s hidden. */}
          <div className="active:scale-95 transition-transform duration-100">
            <SidebarTrigger />
          </div>

          {/* App branding with subtle animation */}
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-500">
            <span className="text-lg font-bold bg-linear-to-r from-foreground to-foreground/80 bg-clip-text">
              AppEx
            </span>
          </div>

          {/* Spacer for potential right-side actions */}
          <div className="flex-1" />
          
          {/* Optional: Add notification badge or user avatar here */}
        </header>

        {/* Main content area with suspense fallback */}
        <div className="flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
          <Suspense
            fallback={
              <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
                <div className="text-muted-foreground animate-pulse">Loading...</div>
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </div>

        {/* Mobile bottom navigation */}
        <MobileBottomBar />
      </SidebarInset>

      {/* Support chat widget */}
      <SupportChat />
    </SidebarProvider>
  )
}
