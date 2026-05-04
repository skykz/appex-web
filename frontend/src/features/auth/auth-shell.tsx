import { Outlet } from 'react-router-dom'
import { cn } from '@shared/lib'

type AuthShellProps = {
  /** Wider panel for multi-step or longer copy. */
  maxWidthClassName?: string
  className?: string
}

/**
 * Shared full-viewport background and container for all unauthenticated auth routes.
 */
export function AuthShell({ maxWidthClassName, className }: AuthShellProps) {
  return (
    <div
      className={cn(
        'relative flex min-h-dvh items-center justify-center px-4 py-10 sm:px-6',
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -top-1/3 left-1/2 h-[min(90vh,900px)] w-[min(100vw,900px)] -translate-x-1/2 rounded-full bg-gradient-to-b from-orange-500/[0.12] via-amber-500/[0.06] to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
      </div>
      <div
        className={cn(
          'relative w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500',
          maxWidthClassName
        )}
      >
        <Outlet />
      </div>
    </div>
  )
}
