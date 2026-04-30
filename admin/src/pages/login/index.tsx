import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2, Zap } from 'lucide-react'
import { adminAuthApi } from '@entities/admin-auth/api/admin-auth-api'
import { useAdminAuthStore } from '@entities/admin-auth/model/auth-store'
import { ApiError } from '@shared/api/http-client'
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
  const { setAuth, isAuthenticated } = useAdminAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: (data: FormData) => adminAuthApi.login(data.email, data.password),
    onSuccess: (data) => {
      setAuth(data)
      toast.success('Welcome back')
      navigate('/dashboard', { replace: true })
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

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  return (
    <div className="admin-main-bg flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-orange-200/40 bg-card/95 p-8 shadow-xl shadow-orange-500/10 ring-1 ring-orange-500/10 backdrop-blur-sm supports-[backdrop-filter]:bg-card/85 sm:p-10">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-md ring-2 ring-orange-400/30">
            <Zap className="h-7 w-7" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">AppEx Admin</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in with your admin account</p>
          </div>
        </div>
        <form
          onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="space-y-5"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="admin@appex.kz"
              className="h-11 border-border/80 shadow-sm"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              className="h-11 border-border/80 shadow-sm"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="h-11 w-full shadow-sm" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
