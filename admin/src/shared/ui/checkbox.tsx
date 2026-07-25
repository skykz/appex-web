import * as React from 'react'
import { cn } from '@shared/lib'

export type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>

/**
 * Styled checkbox with a branded accent color and a consistent focus ring.
 * Forwards its ref and spreads all input props, so it works with both
 * controlled usage and react-hook-form's `register()`.
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <input
      type="checkbox"
      ref={ref}
      className={cn(
        'size-4 shrink-0 cursor-pointer rounded border-input accent-primary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
)
Checkbox.displayName = 'Checkbox'
