import type { ReactNode } from 'react'
import { cn } from '@shared/lib'

interface SkillSectionProps {
  id: string
  title: string
  description?: string
  children: ReactNode
  className?: string
}

/**
 * Vertical catalog block — section title, optional description, and a card row/grid below.
 */
export function SkillSection({
  id,
  title,
  description,
  children,
  className,
}: SkillSectionProps) {
  return (
    <section
      id={id}
      className={cn('scroll-mt-28 border-t border-border/50 pt-10 first:border-t-0 first:pt-0', className)}
    >
      <div className="mb-5 max-w-3xl">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  )
}
