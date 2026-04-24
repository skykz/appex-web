import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2, ShieldCheck } from 'lucide-react'
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
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold">AppEx Admin</h1>
          <p className="text-sm text-muted-foreground">Sign in with your admin account</p>
        </div>
        <form
          onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="admin@appex.kz"
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
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
