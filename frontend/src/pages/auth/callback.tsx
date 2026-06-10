import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, Sparkles } from 'lucide-react'
import { useAuthStore } from '@entities/user'
import { userApi } from '@entities/user/api/user-api'

/**
 * Completes Supabase magic-link sign-in by reading tokens from the URL hash
 * and storing them in the learner app session before redirecting to /home.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const hash = window.location.hash.replace(/^#/, '')
      const params = new URLSearchParams(hash)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}`
      )

      if (!accessToken || !refreshToken) {
        if (!cancelled) {
          setError('This sign-in link is invalid or has expired.')
        }
        return
      }

      try {
        const prevToken = localStorage.getItem('appex_access_token')
        localStorage.setItem('appex_access_token', accessToken)

        let user
        try {
          user = await userApi.getCurrentUser()
        } finally {
          if (!user && prevToken) {
            localStorage.setItem('appex_access_token', prevToken)
          }
        }

        if (!user) {
          throw new Error('Could not load your account after sign-in.')
        }

        if (cancelled) return
        setAuth(user, accessToken, refreshToken)
        navigate('/home', { replace: true })
      } catch (err) {
        if (cancelled) return
        const message =
          err instanceof Error ? err.message : 'Could not complete sign-in.'
        setError(message)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [navigate, setAuth])

  if (error) {
    return (
      <div className="rounded-2xl border border-border/80 bg-card/80 p-6 shadow-lg ring-1 ring-border/40 backdrop-blur-sm sm:p-8 space-y-6 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
          <Sparkles className="text-muted-foreground size-7" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Sign-in link expired</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </div>
        <Link
          to="/auth?tab=signin"
          className="inline-flex text-primary font-semibold hover:underline"
        >
          Go to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="flex justify-center rounded-2xl border border-border/80 bg-card/80 p-10 shadow-lg ring-1 ring-border/40">
      <Loader2 className="text-muted-foreground size-8 animate-spin" />
    </div>
  )
}
