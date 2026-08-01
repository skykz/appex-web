import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@shared/lib'
import { Card, CardContent } from '@shared/ui/card'

/** Visual accent family for the icon well (matches platform “colorful but soft” cards). */
export type StatTone = 'blue' | 'orange' | 'violet' | 'emerald' | 'amber' | 'cyan' | 'rose' | 'slate'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  hint?: string
  /** Drives icon tile gradient and a thin top accent on the card. */
  tone?: StatTone
  /**
   * When set, the whole tile becomes a link to the matching section.
   * Omit for metrics with nowhere to drill into (e.g. revenue totals) — a card
   * that looks clickable but isn't is worse than one that plainly isn't.
   */
  to?: string
}

const toneTop: Record<StatTone, string> = {
  blue: 'border-t-[3px] border-t-primary/70',
  orange: 'border-t-[3px] border-t-orange-500/80',
  violet: 'border-t-[3px] border-t-violet-500/75',
  emerald: 'border-t-[3px] border-t-emerald-500/75',
  amber: 'border-t-[3px] border-t-amber-500/80',
  cyan: 'border-t-[3px] border-t-cyan-500/75',
  rose: 'border-t-[3px] border-t-rose-500/70',
  slate: 'border-t-[3px] border-t-slate-400/80',
}

const toneIcon: Record<StatTone, string> = {
  blue:
    'bg-gradient-to-br from-sky-400/25 to-primary/15 text-primary ring-1 ring-primary/20 shadow-sm',
  orange:
    'bg-gradient-to-br from-orange-400/30 to-amber-100/90 text-orange-800 ring-1 ring-orange-200/80 shadow-sm',
  violet:
    'bg-gradient-to-br from-violet-400/25 to-purple-500/15 text-violet-800 ring-1 ring-violet-200/70 shadow-sm',
  emerald:
    'bg-gradient-to-br from-emerald-400/25 to-emerald-600/12 text-emerald-800 ring-1 ring-emerald-200/65 shadow-sm',
  amber:
    'bg-gradient-to-br from-amber-300/35 to-yellow-100/80 text-amber-950 ring-1 ring-amber-200/75 shadow-sm',
  cyan:
    'bg-gradient-to-br from-cyan-400/25 to-cyan-600/12 text-cyan-900 ring-1 ring-cyan-200/60 shadow-sm',
  rose:
    'bg-gradient-to-br from-rose-400/25 to-rose-500/12 text-rose-800 ring-1 ring-rose-200/55 shadow-sm',
  slate:
    'bg-gradient-to-br from-slate-200 to-slate-300/60 text-slate-800 ring-1 ring-slate-300/60 shadow-sm',
}

/**
 * Compact metric tile for the admin dashboard; uses soft gradients like the user ProgressCard area.
 */
export function StatCard({ label, value, icon: Icon, hint, tone = 'blue', to }: StatCardProps) {
  const card = (
    <Card
      className={cn(
        'overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-orange-50/25 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
        // Only the linked variant gets affordances — cursor, stronger hover and a
        // focus ring — so a non-clickable tile never looks interactive.
        to && 'cursor-pointer hover:border-primary/40',
        toneTop[tone]
      )}
    >
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 truncate text-2xl font-semibold tabular-nums tracking-tight text-foreground">
            {value}
          </div>
          {hint ? <div className="mt-1.5 text-xs leading-snug text-muted-foreground">{hint}</div> : null}
        </div>
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            toneIcon[tone]
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  )

  if (!to) return card

  return (
    <Link
      to={to}
      // aria-label spells out the metric because the tile's own text is split
      // across three nodes; a screen reader would otherwise announce "14" alone.
      aria-label={`${label}: ${value}. View details`}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
    >
      {card}
    </Link>
  )
}
