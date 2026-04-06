import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { Button, Input, Label } from '@shared/ui'
import { useCreateUser } from '@entities/user'

const signupSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[a-z]/, 'Password must contain a lowercase letter')
      .regex(/[0-9]/, 'Password must contain a number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type SignupFormValues = z.infer<typeof signupSchema>

export function SignupForm() {
  const createUser = useCreateUser()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupFormValues) => {
    createUser.mutate({
      name: data.name,
      email: data.email,
      password: data.password,
    })
  }

  const isPending = isSubmitting || createUser.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="signup-name">Name</Label>
        <Input
          id="signup-name"
          type="text"
          placeholder="John Doe"
          autoComplete="name"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'signup-name-error' : undefined}
          className="rounded-xl"
          {...register('name')}
        />
        {errors.name && (
          <p id="signup-name-error" className="text-destructive text-sm animate-in fade-in slide-in-from-top-1 duration-200" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'signup-email-error' : undefined}
          className="rounded-xl"
          {...register('email')}
        />
        {errors.email && (
          <p id="signup-email-error" className="text-destructive text-sm animate-in fade-in slide-in-from-top-1 duration-200" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <p className="text-muted-foreground text-xs">
          At least 8 characters with uppercase, lowercase, and a number.
        </p>
        <div className="relative">
          <Input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Create a password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'signup-password-error' : undefined}
            className="rounded-xl pr-10"
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
          <p id="signup-password-error" className="text-destructive text-sm animate-in fade-in slide-in-from-top-1 duration-200" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-confirm-password">Confirm Password</Label>
        <Input
          id="signup-confirm-password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Confirm your password"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          aria-describedby={
            errors.confirmPassword ? 'signup-confirm-password-error' : undefined
          }
          className="rounded-xl"
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p
            id="signup-confirm-password-error"
            className="text-destructive text-sm animate-in fade-in slide-in-from-top-1 duration-200"
            role="alert"
          >
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full rounded-xl"
        disabled={isPending}
      >
        {isPending ? 'Creating account...' : 'Create Account'}
      </Button>

      {createUser.isError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300" role="alert">
          <p className="text-destructive text-center text-sm">
            {createUser.error instanceof Error
              ? createUser.error.message
              : 'Signup failed. Please try again.'}
          </p>
        </div>
      )}
    </form>
  )
}
