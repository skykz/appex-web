import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from 'lucide-react'
import { userApi } from '@entities/user/api/user-api'
import { Button, Input, Label } from '@shared/ui'
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
 * Reads Supabase recovery tokens from the URL hash and submits a new password to the API.
 */
export default function ResetPasswordPage() {
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
      userApi.recoverPassword({
        accessToken: accessToken as string,
        newPassword: data.newPassword,
      }),
    onSuccess: () => {
      navigate('/auth', { replace: true, state: { passwordReset: true } })
    },
  })

  if (accessToken === null) {
    return (
      <div className="flex justify-center rounded-2xl border border-border/80 bg-card/80 p-10 shadow-lg ring-1 ring-border/40">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    )
  }

  if (accessToken === '') {
    return (
      <div className="rounded-2xl border border-border/80 bg-card/80 p-6 shadow-lg ring-1 ring-border/40 backdrop-blur-sm sm:p-8 space-y-6 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
          <KeyRound className="text-muted-foreground size-7" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Link invalid or expired</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Request a new reset link from the sign-in page.
          </p>
        </div>
        <Button className="w-full rounded-xl" asChild>
          <Link to="/auth/forgot-password">Request new link</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-card/80 p-6 shadow-lg ring-1 ring-border/40 backdrop-blur-sm sm:p-8 space-y-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md ring-1 ring-orange-200/60">
          <ShieldCheck className="size-7" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Choose a new password</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Use at least 8 characters. Then sign in with your new password.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit((d) => mutation.mutate(d))}
        className="space-y-4"
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="new-pw">New password</Label>
          <div className="relative">
            <Input
              id="new-pw"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              className="h-12 rounded-xl pr-12"
              aria-invalid={!!errors.newPassword}
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
            <p className="text-destructive text-sm" role="alert">
              {errors.newPassword.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-pw">Confirm password</Label>
          <div className="relative">
            <Input
              id="confirm-pw"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              className="h-12 rounded-xl pr-12"
              aria-invalid={!!errors.confirm}
              {...register('confirm')}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {errors.confirm ? (
            <p className="text-destructive text-sm" role="alert">
              {errors.confirm.message}
            </p>
          ) : null}
        </div>

        {mutation.isError ? (
          <div
            className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-center text-sm text-destructive"
            role="alert"
          >
            {mutation.error instanceof ApiError
              ? mutation.error.message
              : 'Could not update password.'}
          </div>
        ) : null}

        <Button
          type="submit"
          className="h-12 w-full rounded-xl text-base"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            'Save password'
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <Link to="/auth" className="text-primary font-semibold hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
