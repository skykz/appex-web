import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { cn } from '@shared/lib'
import { EmojiOrImageBadge } from '@shared/ui/emoji-or-image-badge'
import type { SkillCardModel } from './types'
import { PaywallDialog } from './paywall-dialog'

interface SkillCardProps {
  skill: SkillCardModel
}

export function SkillCard({ skill }: SkillCardProps) {
  // Premium-locked skills stay clickable but route to the paywall modal
  // instead of /skills/:id (which would 402 on the first lesson fetch anyway).
  const [paywallOpen, setPaywallOpen] = useState(false)
  const isPremiumLocked = !!skill.premium_locked

  const sharedClass = cn(
    'group flex flex-col overflow-hidden rounded-2xl border-2 text-left shadow-sm ring-1 ring-black/[0.04] transition-all duration-200',
    'hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.99] dark:ring-white/[0.06]',
    isPremiumLocked
      ? 'border-amber-300/50 bg-card hover:border-amber-400 hover:shadow-amber-500/10'
      : 'border-border/70 bg-card hover:border-primary/45 hover:shadow-primary/10'
  )

  const body = (
    <>
      {/* Emoji icon area */}
      <div
        className={cn(
          'relative flex h-40 items-center justify-center',
          isPremiumLocked
            ? 'bg-gradient-to-b from-amber-50 via-orange-50/60 to-muted/30 dark:from-amber-950/30 dark:via-orange-950/20'
            : 'bg-gradient-to-b from-primary/[0.08] via-muted/40 to-muted/30'
        )}
      >
        <div className="transition-transform duration-200 group-hover:scale-105">
          <EmojiOrImageBadge
            value={skill.emoji}
            frameClassName="h-28 w-28 text-6xl drop-shadow-sm"
          />
        </div>

        {/* Top-left status pill */}
        {skill.status === 'completed' ? (
          <span className="absolute left-3 top-3 rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-semibold text-green-600">
            Completed
          </span>
        ) : skill.progress > 0 ? (
          <span className="absolute left-3 top-3 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {skill.progress}%
          </span>
        ) : null}

        {/* Top-right Premium badge */}
        {isPremiumLocked && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm">
            <Sparkles className="size-3" />
            Premium
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-1.5 border-t border-border/50 bg-card p-4">
        <h3 className="font-semibold leading-snug tracking-tight text-foreground">
          {skill.title}
        </h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {skill.description}
        </p>
      </div>
    </>
  )

  if (isPremiumLocked) {
    return (
      <>
        <button
          type="button"
          onClick={() => setPaywallOpen(true)}
          className={sharedClass}
          aria-label={`Unlock ${skill.title} with Premium`}
        >
          {body}
        </button>
        <PaywallDialog
          open={paywallOpen}
          onOpenChange={setPaywallOpen}
          blockedContent={skill.title}
        />
      </>
    )
  }

  return (
    <Link to={`/skills/${skill.id}`} className={sharedClass}>
      {body}
    </Link>
  )
}
