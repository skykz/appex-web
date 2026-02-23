/**
 * Mobile bottom navigation bar component.
 * Sticky bar visible on mobile and tablet (lg:hidden) with quick actions.
 * Features: tap animations, active state indicators, haptic feedback support.
 * Respects sidebar width when open (flexible layout).
 */
import { Link, useLocation } from 'react-router-dom'
import { Home, Puzzle, Sparkles, User } from 'lucide-react'
import { cn } from '@shared/lib'
import { useSidebar } from '@shared/ui/sidebar'

/**
 * Navigation item type for bottom bar.
 */
type BottomNavItem = {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
}

/**
 * Bottom navigation items configuration.
 */
const navItems: BottomNavItem[] = [
  { title: 'Home', url: '/home', icon: Home },
  { title: 'Skills', url: '/skills', icon: Puzzle },
  { title: 'AI Tools', url: '/ai-tools', icon: Sparkles },
  { title: 'User', url: '/settings', icon: User },
]

/**
 * MobileBottomBar - Sticky bottom navigation for mobile and tablet devices.
 * Provides quick access to main app sections with smooth animations.
 * Fixed on mobile (<768px) and tablet (<1024px) breakpoints.
 */
export const MobileBottomBar = () => {
  const location = useLocation()
  const { openMobile, isMobile } = useSidebar()

  /**
   * When mobile sidebar (Sheet) is open, hide the bottom bar
   * so it doesn't overlap with the sidebar content.
   */
  const isHidden = isMobile && openMobile

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t bg-background/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)] supports-backdrop-filter:bg-background/80',
        'transition-all duration-200 ease-out',
        // Hide when mobile sidebar is open
        isHidden && 'translate-y-full opacity-0 pointer-events-none'
      )}
      role="navigation"
      aria-label="Mobile navigation"
    >
      {/* Shadow/elevation for depth */}
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-border to-transparent" />
      
      <div className="grid grid-cols-4 h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.url)
          const Icon = item.icon

          return (
            <Link
              key={item.url}
              to={item.url}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5',
                'transition-all duration-200 ease-out',
                'active:scale-95',
                'tap-target', // Ensures 44px minimum touch target
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
              aria-label={item.title}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Icon container with animation */}
              <div
                className={cn(
                  'relative flex items-center justify-center transition-all duration-200',
                  isActive ? 'scale-110' : 'scale-100'
                )}
              >
                {/* Active indicator - pill background */}
                {isActive && (
                  <div className="absolute inset-0 -m-2 rounded-full bg-primary/10 animate-in fade-in zoom-in-95 duration-200" />
                )}
                
                <Icon
                  className={cn(
                    'relative size-6 transition-all duration-200',
                    isActive ? 'stroke-[2.5]' : 'stroke-2'
                  )}
                />
              </div>

              {/* Label with fade */}
              <span
                className={cn(
                  'text-[10px] font-medium transition-all duration-200',
                  isActive ? 'opacity-100 scale-100' : 'opacity-70 scale-95'
                )}
              >
                {item.title}
              </span>

              {/* Active indicator - bottom bar */}
              {isActive && (
                <div className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary animate-in slide-in-from-bottom-1 duration-200" />
              )}

              {/* Ripple effect on tap (visual feedback) */}
              <span className="absolute inset-0 rounded-lg overflow-hidden">
                <span className="absolute inset-0 bg-primary/5 opacity-0 transition-opacity active:opacity-100 duration-75" />
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
