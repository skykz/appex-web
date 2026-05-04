import { cva } from 'class-variance-authority'

/**
 * Button variants configuration using CVA.
 * Defines visual styles for different button types and sizes.
 */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold tracking-tight ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 tap-target',
  {
    variants: {
      variant: {
        default:
          'border border-primary/20 bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/[0.92] hover:shadow-lg hover:shadow-primary/35 active:scale-[0.98]',
        destructive:
          'border border-destructive/20 bg-destructive text-destructive-foreground shadow-md shadow-destructive/20 hover:bg-destructive/92 hover:shadow-lg active:scale-[0.98]',
        outline:
          'border-2 border-primary/35 bg-card text-foreground shadow-sm hover:border-primary/55 hover:bg-primary/[0.06] hover:text-foreground hover:shadow-md active:scale-[0.98]',
        secondary:
          'border border-border/80 bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/75 hover:shadow active:scale-[0.98]',
        ghost:
          'font-medium text-foreground hover:bg-accent hover:text-accent-foreground',
        link: 'font-medium text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        xl: 'h-12 rounded-xl px-6 py-3 text-sm font-semibold',
        icon: 'h-10 w-10',
        'sm-icon': 'size-8 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)
