import { useState, useEffect } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { cn, getSafeInternalPath } from '@shared/lib'
import { SigninForm, SignupForm } from '@features/auth'
import { useAuthStore } from '@entities/user'

type AuthTab = 'signin' | 'signup'

/**
 * Authentication page with sign-in/sign-up tabs.
 * Redirects to home if already authenticated.
 * Query: ?tab=signup opens sign-up; ?next=/skills (internal path only) used after success — for landings on appex.kz.
 */
export default function AuthPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const [tab, setTab] = useState<AuthTab>('signin')
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const passwordJustReset =
    (location.state as { passwordReset?: boolean } | null)?.passwordReset ===
    true

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t === 'signup') setTab('signup')
    if (t === 'signin') setTab('signin')
  }, [searchParams])

  if (isAuthenticated) {
    const next = getSafeInternalPath(searchParams.get('next'))
    return <Navigate to={next ?? '/home'} replace />
  }

  return (
    <>
      {/* Logo & Brand */}
      <div className="flex flex-col items-center gap-4">
        <div
          className={cn(
            'flex size-16 items-center justify-center rounded-2xl text-white shadow-lg',
            'bg-linear-to-br from-orange-500 to-amber-500',
            'ring-2 ring-orange-400/25',
            'transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]'
          )}
        >
          <Zap className="size-8" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {tab === 'signin' ? 'Welcome back' : 'Create an account'}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed sm:text-base">
            {tab === 'signin'
              ? 'Sign in to pick up where you left off.'
              : 'A few details and you’re ready to go.'}
          </p>
        </div>
      </div>

      {passwordJustReset ? (
        <div
          className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-800 dark:text-emerald-100"
          role="status"
        >
          Password updated. You can sign in with your new password.
        </div>
      ) : null}

      {/* Tab Switcher */}
      <div className="flex rounded-2xl border border-border/60 bg-muted/40 p-1.5 shadow-inner">
        <button
          type="button"
          onClick={() => setTab('signin')}
          className={cn(
            'flex-1 rounded-xl py-3 text-center text-sm font-semibold transition-all duration-200',
            tab === 'signin'
              ? 'bg-background text-foreground shadow-md ring-1 ring-border/60'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setTab('signup')}
          className={cn(
            'flex-1 rounded-xl py-3 text-center text-sm font-semibold transition-all duration-200',
            tab === 'signup'
              ? 'bg-background text-foreground shadow-md ring-1 ring-border/60'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Sign up
        </button>
      </div>

      {/* Form Card */}
      <div className="rounded-2xl border border-border/80 bg-card/90 p-6 shadow-xl ring-1 ring-border/40 backdrop-blur-sm sm:p-8">
        {tab === 'signin' ? <SigninForm /> : <SignupForm />}
      </div>

      {/* Footer Toggle */}
      <p className="text-center text-sm text-muted-foreground">
        {tab === 'signin' ? (
          <>
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => setTab('signup')}
              className="text-primary font-semibold underline-offset-4 hover:underline"
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setTab('signin')}
              className="text-primary font-semibold underline-offset-4 hover:underline"
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </>
  )
}
