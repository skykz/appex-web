import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Mail } from 'lucide-react'
import { userApi } from '@entities/user/api/user-api'
import { Button, Input, Label } from '@shared/ui'
import { ApiError } from '@shared/api/http-client'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
})

type FormValues = z.infer<typeof schema>

/**
 * Collects email and requests a branded password reset link via the API (neutral success copy).
 */
export default function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: (data: FormValues) => userApi.forgotPassword(data.email),
  })

  if (mutation.isSuccess) {
    return (
      <div className="rounded-2xl border border-border/80 bg-card/80 p-6 shadow-lg ring-1 ring-border/40 backdrop-blur-sm sm:p-8 space-y-6 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-lg ring-1 ring-emerald-500/20">
          <Mail className="size-7" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            {mutation.data?.message}
          </p>
        </div>
        <Button variant="outline" className="w-full rounded-xl" asChild>
          <Link to="/auth" className="gap-2">
            <ArrowLeft className="size-4" />
            Back to sign in
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-card/80 p-6 shadow-lg ring-1 ring-border/40 backdrop-blur-sm sm:p-8 space-y-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div
          className="flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-orange-500 to-amber-500 text-white shadow-md ring-1 ring-orange-200/60"
          aria-label="AppEx"
        >
          <span className="text-xl font-extrabold leading-none tracking-tight">
            A<span className="italic text-[#111]">X</span>
          </span>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            We&apos;ll email you a link to choose a new password.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit((d) => mutation.mutate(d))}
        className="space-y-5"
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="forgot-email">Email</Label>
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="h-12 rounded-xl"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          {errors.email ? (
            <p className="text-destructive text-sm" role="alert">
              {errors.email.message}
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
              : 'Could not send reset email. Try again later.'}
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
            'Send reset link'
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          to="/auth"
          className="text-primary font-semibold hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
