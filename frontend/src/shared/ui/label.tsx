import * as React from 'react'
import { cn } from '@shared/lib'

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>

/**
 * Label component for form fields with consistent styling.
 *
 * @example
 * <Label htmlFor="email">Email address</Label>
 */
const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          className
        )}
        {...props}
      />
    )
  }
)
Label.displayName = 'Label'

export { Label }
