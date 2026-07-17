import { cn } from '@shared/lib'

interface LogoProps {
  className?: string
}

/**
 * AppEx wordmark — "App" in the foreground color, "ex" in the brand orange.
 * Text-based (not an image) so it stays crisp at any size and themes automatically.
 */
export function Logo({ className }: LogoProps) {
  return (
    <span className={cn('font-extrabold tracking-tight', className)}>
      <span className="text-foreground">App</span>
      <span className="text-primary">ex</span>
    </span>
  )
}
