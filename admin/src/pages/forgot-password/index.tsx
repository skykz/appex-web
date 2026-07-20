import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, KeyRound, Loader2, Mail } from 'lucide-react'
import { adminAuthApi } from '@entities/admin-auth/api/admin-auth-api'
import { Button } from '@shared/ui/button'
import { Input } from '@shared/ui/input'
import { Label } from '@shared/ui/label'
import { ApiError } from '@shared/api/http-client'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
})

type FormValues = z.infer<typeof schema>

/**
 * Admin: requests a password reset email (Supabase) with redirect to this app’s reset page.
 */
export function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: (data: FormValues) => adminAuthApi.forgotPassword(data.email),
  })

  if (mutation.isSuccess) {
    return (
      <div className="admin-main-bg flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-orange-200/40 bg-card/95 p-8 text-center shadow-xl shadow-orange-500/10 ring-1 ring-orange-500/10 backdrop-blur-sm supports-[backdrop-filter]:bg-card/85 sm:p-10">
          <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg ring-1 ring-emerald-500/20">
            <Mail className="size-7" aria-hidden />
          </div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Check your email
          </h1>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            {mutation.data?.message}
          </p>
          <Button variant="outline" className="mt-8 h-11 w-full" asChild>
            <Link to="/login" className="gap-2">
              <ArrowLeft className="size-4" />
              Back to sign in
            </Link>
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
            <KeyRound className="h-7 w-7" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Reset your password
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              We&apos;ll email you a link to choose a new password.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="space-y-5"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="admin-forgot-email">Email</Label>
            <Input
              id="admin-forgot-email"
              type="email"
              autoComplete="email"
              placeholder="hello@appexme.com"
              className="h-11 border-border/80 shadow-sm"
              {...register('email')}
            />
            {errors.email ? (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            ) : null}
          </div>

          {mutation.isError ? (
            <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-center text-sm text-destructive">
              {mutation.error instanceof ApiError
                ? mutation.error.message
                : 'Could not send reset email.'}
            </div>
          ) : null}

          <Button type="submit" className="h-11 w-full shadow-sm" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Send reset link'
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
