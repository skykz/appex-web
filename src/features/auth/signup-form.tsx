import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input, Label } from '@shared/ui'
import { useCreateUser } from '@entities/user'

/**
 * Signup form validation schema using Zod.
 * Defines field requirements and validation rules.
 */
const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type SignupFormValues = z.infer<typeof signupSchema>

/**
 * SignupForm feature component with validation and error handling.
 * Uses React Hook Form with Zod for type-safe validation.
 *
 * @example
 * <SignupForm onSuccess={() => navigate('/home')} />
 */
export function SignupForm({ onSuccess }: { onSuccess?: () => void }) {
  const createUser = useCreateUser()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  })

  /**
   * Form submission handler.
   * Creates user and calls onSuccess callback on success.
   */
  const onSubmit = async (data: SignupFormValues) => {
    try {
      await createUser.mutateAsync(data)
      onSuccess?.()
    } catch (error) {
      console.error('Signup failed:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          type="text"
          placeholder="John Doe"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          {...register('name')}
        />
        {errors.name && (
          <p id="name-error" className="text-destructive text-sm" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')}
        />
        {errors.email && (
          <p id="email-error" className="text-destructive text-sm" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
          {...register('password')}
        />
        {errors.password && (
          <p
            id="password-error"
            className="text-destructive text-sm"
            role="alert"
          >
            {errors.password.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || createUser.isPending}
      >
        {isSubmitting || createUser.isPending
          ? 'Creating account...'
          : 'Sign Up'}
      </Button>

      {createUser.isError && (
        <p className="text-destructive text-center text-sm" role="alert">
          Signup failed. Please try again.
        </p>
      )}
    </form>
  )
}
