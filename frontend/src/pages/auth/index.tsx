import { useState, useEffect } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
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
  const [tab, setTab] = useState<AuthTab>('signin')
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

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
    <div className="relative flex min-h-dvh items-center justify-center px-4 py-8">
      {/* Background gradient accent */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-orange-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Logo & Brand */}
        <div className="flex flex-col items-center gap-4">
          <div
            className={cn(
              'flex size-14 items-center justify-center rounded-2xl text-white shadow-md',
              'bg-linear-to-br from-orange-500 to-amber-500',
              'ring-1 ring-orange-200/80',
              'transition-transform duration-200 hover:scale-105 active:scale-95'
            )}
          >
            <Zap className="size-7" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              {tab === 'signin' ? 'Welcome back' : 'Create an account'}
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              {tab === 'signin'
                ? 'Sign in to your account to continue'
                : 'Enter your details to get started'}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="bg-muted flex rounded-2xl p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setTab('signin')}
            className={cn(
              'flex-1 rounded-xl py-2.5 text-center text-sm font-semibold transition-all duration-200',
              tab === 'signin'
                ? 'bg-background text-foreground shadow-sm ring-1 ring-border/50'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setTab('signup')}
            className={cn(
              'flex-1 rounded-xl py-2.5 text-center text-sm font-semibold transition-all duration-200',
              tab === 'signup'
                ? 'bg-background text-foreground shadow-sm ring-1 ring-border/50'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Sign Up
          </button>
        </div>

        {/* Form Card */}
        <div className="bg-card rounded-2xl border p-6 shadow-sm">
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
                className="text-primary font-semibold hover:underline transition-colors"
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
                className="text-primary font-semibold hover:underline transition-colors"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
