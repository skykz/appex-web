import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { Button, Input, Label } from '@shared/ui'
import { useLogin } from '@entities/user'

const signinSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type SigninFormValues = z.infer<typeof signinSchema>

export function SigninForm() {
  const login = useLogin()
  const [showPassword, setShowPassword] = useState(false)
  const [searchParams] = useSearchParams()
  const emailFromLanding = searchParams.get('email')

  const defaultValues = useMemo(
    () => ({
      email:
        emailFromLanding && emailFromLanding.includes('@')
          ? emailFromLanding
          : '',
      password: '',
    }),
    [emailFromLanding]
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SigninFormValues>({
    resolver: zodResolver(signinSchema),
    defaultValues,
  })

  const onSubmit = async (data: SigninFormValues) => {
    login.mutate(data)
  }

  const isPending = isSubmitting || login.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'signin-email-error' : undefined}
          className="h-11 rounded-xl"
          {...register('email')}
        />
        {errors.email && (
          <p id="signin-email-error" className="text-destructive text-sm animate-in fade-in slide-in-from-top-1 duration-200" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="signin-password">Password</Label>
          <Link
            to="/auth/forgot-password"
            className="text-primary text-xs font-semibold underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="signin-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'signin-password-error' : undefined}
            className="h-11 rounded-xl pr-10"
            {...register('password')}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {errors.password && (
          <p id="signin-password-error" className="text-destructive text-sm animate-in fade-in slide-in-from-top-1 duration-200" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="mt-1 h-11 w-full rounded-xl text-sm font-semibold shadow-md"
        disabled={isPending}
      >
        {isPending ? 'Signing in...' : 'Sign in'}
      </Button>

      {login.isError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300" role="alert">
          <p className="text-destructive text-center text-sm">
            {login.error instanceof Error
              ? login.error.message
              : 'Invalid email or password. Please try again.'}
          </p>
        </div>
      )}
    </form>
  )
}
