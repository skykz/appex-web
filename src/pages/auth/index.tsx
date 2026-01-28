import { SignupForm } from '@features/auth'

/**
 * Authentication page - login/signup form.
 */
export default function AuthPage() {
  return (
    <div className="container flex min-h-dvh items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Create an account</h1>
          <p className="text-muted-foreground">
            Enter your details to get started
          </p>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <SignupForm onSuccess={() => console.log('Signup successful!')} />
        </div>
      </div>
    </div>
  )
}
