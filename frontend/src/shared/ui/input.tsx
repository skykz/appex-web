import * as React from 'react'
import { cn } from '@shared/lib'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

/**
 * Input component with consistent styling and accessibility.
 * Works seamlessly with React Hook Form.
 *
 * @example
 * <Input type="email" placeholder="you@example.com" />
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // text-base on mobile keeps iOS from zooming in on focus; text-sm from sm+.
          'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-11 w-full rounded-md border px-3 py-2 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:text-sm',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
