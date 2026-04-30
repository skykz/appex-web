import { type ReactNode } from 'react'

export interface PageHeaderProps {
  /** Main heading shown at the top of an admin screen. */
  title: string
  /** Optional supporting line under the title. */
  description?: string
  /** Small pill above the title (same language as the user app “Personal plan” chip). */
  badge?: string
  /** Primary actions (buttons) aligned to the right on wide layouts. */
  actions?: ReactNode
}

/**
 * Renders a consistent title block for admin pages so typography and spacing stay aligned.
 */
export function PageHeader({ title, description, badge, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-2">
        {badge ? (
          <span className="inline-flex w-fit rounded-full bg-[hsl(var(--sidebar-accent))] px-3 py-1 text-xs font-semibold text-[hsl(var(--sidebar-accent-foreground))] ring-1 ring-orange-200/50">
            {badge}
          </span>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}
