import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, Zap } from 'lucide-react'
import { adminAuthApi } from '@entities/admin-auth/api/admin-auth-api'
import { useAdminAuthStore } from '@entities/admin-auth/model/auth-store'
import { ApiError } from '@shared/api/http-client'
import { getSafeReturnPath } from '@shared/lib/safe-return-path'
import { Button } from '@shared/ui/button'
import { Input } from '@shared/ui/input'
import { Label } from '@shared/ui/label'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

/** Admin-only sign-in gate backed by the shared API and role check on the server. */
export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { setAuth, isAuthenticated } = useAdminAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const passwordResetToastShown = useRef(false)

  const fromState = (location.state as { from?: string } | null)?.from
  const fromQuery = searchParams.get('from')

  const passwordJustReset =
    (location.state as { passwordReset?: boolean } | null)?.passwordReset === true

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (searchParams.get('session') === 'expired') {
      toast.info('Session expired. Please sign in again.')
    }
  }, [searchParams])

  useEffect(() => {
    if (!passwordJustReset || passwordResetToastShown.current) return
    passwordResetToastShown.current = true
    toast.success('Password updated. Sign in with your new password.')
    navigate('/login', { replace: true, state: {} })
  }, [passwordJustReset, navigate])

  const mutation = useMutation({
    mutationFn: (data: FormData) => adminAuthApi.login(data.email, data.password),
    onSuccess: (data) => {
      setAuth(data)
      toast.success('Welcome back')
      const target = getSafeReturnPath(fromState ?? fromQuery ?? undefined)
      navigate(target, { replace: true })
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.status === 403
            ? 'This account is not an admin.'
            : err.message
          : 'Login failed'
      toast.error(msg)
    },
  })

  if (isAuthenticated) {
    const target = getSafeReturnPath(fromState ?? fromQuery ?? undefined)
    return <Navigate to={target} replace />
  }

  return (
    <div className="admin-main-bg flex min-h-screen items-center justify-center px-4 py-12 sm:py-16">
      <div className="w-full max-w-[420px] rounded-2xl border border-orange-200/50 bg-card/95 p-8 shadow-2xl shadow-orange-500/15 ring-1 ring-orange-500/15 backdrop-blur-md supports-[backdrop-filter]:bg-card/90 sm:p-10">
        <div className="mb-9 flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-lg ring-2 ring-orange-400/35">
            <Zap className="h-8 w-8" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-[1.65rem]">AppEx Admin</h1>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Sign in with your admin account
            </p>
          </div>
        </div>
        <form
          onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="space-y-5"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="admin@appex.kz"
              className="h-12 border-border/80 shadow-sm"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password">Password</Label>
              <Link
                to="/forgot-password"
                className="text-primary text-xs font-semibold hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="h-12 border-border/80 pr-11 shadow-sm"
                {...register('password')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="h-12 w-full text-base font-semibold shadow-md" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
