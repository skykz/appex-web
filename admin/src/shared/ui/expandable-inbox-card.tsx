import { useState, type ComponentType, type ReactNode } from 'react'

interface ExpandableInboxCardProps {
  /** Whether the item is still unread — controls the "New" pill. */
  unread: boolean
  /** Lucide icon shown at the trailing edge of the header. */
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  /** Status/category pills rendered before the title. */
  badges?: ReactNode
  /** Primary line (subject / lesson title). */
  title: ReactNode
  /** Secondary muted lines (sender, timestamp, etc.). */
  meta?: ReactNode
  /** Called the first time the card is expanded (e.g. to mark it read). */
  onFirstOpen?: () => void
  /** Expanded body content. */
  children: ReactNode
}

/**
 * Collapsible inbox/queue row with a "New" pill, header badges, and read-on-open
 * behavior. Shared by the Support inbox and Submissions queue.
 */
export function ExpandableInboxCard({
  unread,
  icon: Icon,
  badges,
  title,
  meta,
  onFirstOpen,
  children,
}: ExpandableInboxCardProps) {
  const [open, setOpen] = useState(false)

  /** Expands the card and fires onFirstOpen the first time it is opened. */
  function toggleOpen() {
    const next = !open
    setOpen(next)
    if (next) onFirstOpen?.()
  }

  return (
    <li className="rounded-xl border border-border/70 bg-card shadow-sm">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
        onClick={toggleOpen}
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {unread ? (
              <span className="rounded-full bg-red-600/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-600">
                New
              </span>
            ) : null}
            {badges}
          </div>
          <p className="mt-1 font-medium">{title}</p>
          {meta}
        </div>
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
      {open ? <div className="border-t border-border/60 px-4 py-3">{children}</div> : null}
    </li>
  )
}
