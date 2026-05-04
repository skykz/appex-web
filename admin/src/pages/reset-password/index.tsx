import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from 'lucide-react'
import { adminAuthApi } from '@entities/admin-auth/api/admin-auth-api'
import { Button } from '@shared/ui/button'
import { Input } from '@shared/ui/input'
import { Label } from '@shared/ui/label'
import { ApiError } from '@shared/api/http-client'

const schema = z
  .object({
    newPassword: z.string().min(8, 'At least 8 characters'),
    confirm: z.string().min(1, 'Confirm your password'),
  })
  .refine((d) => d.newPassword === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })

type FormValues = z.infer<typeof schema>

/**
 * Admin: completes password recovery using tokens from the Supabase email link hash.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '')
    const params = new URLSearchParams(hash)
    const token = params.get('access_token')
    if (token) {
      setAccessToken(token)
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}`
      )
    } else {
      setAccessToken('')
    }
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      adminAuthApi.recoverPassword({
        accessToken: accessToken as string,
        newPassword: data.newPassword,
      }),
    onSuccess: () => {
      navigate('/login', { replace: true, state: { passwordReset: true } })
    },
  })

  if (accessToken === null) {
    return (
      <div className="admin-main-bg flex min-h-screen items-center justify-center px-4 py-12">
        <Loader2 className="text-muted-foreground size-10 animate-spin" />
      </div>
    )
  }

  if (accessToken === '') {
    return (
      <div className="admin-main-bg flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-orange-200/40 bg-card/95 p-8 text-center shadow-xl sm:p-10">
          <div className="bg-muted mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl">
            <KeyRound className="text-muted-foreground size-7" />
          </div>
          <h1 className="text-lg font-semibold">Link invalid or expired</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Request a new reset link from the sign-in page.
          </p>
          <Button className="mt-6 h-11 w-full" asChild>
            <Link to="/forgot-password">Request new link</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-main-bg flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-orange-200/40 bg-card/95 p-8 shadow-xl shadow-orange-500/10 ring-1 ring-orange-500/10 backdrop-blur-sm supports-[backdrop-filter]:bg-card/85 sm:p-10">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-md ring-2 ring-orange-400/30">
            <ShieldCheck className="h-7 w-7" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Choose a new password
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              At least 8 characters. Then sign in with your new password.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="admin-new-pw">New password</Label>
            <div className="relative">
              <Input
                id="admin-new-pw"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                className="h-11 border-border/80 pr-10 shadow-sm"
                {...register('newPassword')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.newPassword ? (
              <p className="text-xs text-destructive">{errors.newPassword.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="admin-confirm-pw">Confirm password</Label>
            <div className="relative">
              <Input
                id="admin-confirm-pw"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                className="h-11 border-border/80 pr-10 shadow-sm"
                {...register('confirm')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.confirm ? (
              <p className="text-xs text-destructive">{errors.confirm.message}</p>
            ) : null}
          </div>

          {mutation.isError ? (
            <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-center text-sm text-destructive">
              {mutation.error instanceof ApiError
                ? mutation.error.message
                : 'Could not update password.'}
            </div>
          ) : null}

          <Button type="submit" className="h-11 w-full shadow-sm" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Save password'
            )}
          </Button>
        </form>

        <p className="text-muted-foreground mt-6 text-center text-sm">
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
