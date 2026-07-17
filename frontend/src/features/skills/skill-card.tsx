import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { cn } from '@shared/lib'
import { buttonVariants } from '@shared/ui/button-variants'
import { EmojiOrImageBadge } from '@shared/ui/emoji-or-image-badge'
import type { SkillCardModel } from './types'
import { PaywallDialog } from './paywall-dialog'

interface SkillCardProps {
  skill: SkillCardModel
  /** Featured challenge cards can span a narrower column on large screens. */
  featured?: boolean
}

/**
 * Returns the primary CTA label based on learner progress on the skill.
 */
function ctaLabel(skill: SkillCardModel): string {
  if (skill.status === 'completed') return 'Review course'
  if (skill.status === 'in_progress' || skill.progress > 0) return 'Continue'
  return 'Join now'
}

/**
 * Course card used in the skills catalog sections.
 */
export function SkillCard({ skill, featured = false }: SkillCardProps) {
  const [paywallOpen, setPaywallOpen] = useState(false)
  const isPremiumLocked = !!skill.premium_locked

  const sharedClass = cn(
    'group flex h-full flex-col overflow-hidden rounded-[24px] border border-border/70 bg-card text-left shadow-sm transition-all duration-200',
    'hover:-translate-y-0.5 hover:border-border hover:shadow-md',
    featured && 'max-w-sm'
  )

  const body = (
    <>
      <div
        className={cn(
          'relative flex aspect-[16/10] items-center justify-center bg-muted/35',
          isPremiumLocked && 'bg-linear-to-b from-amber-50/80 via-muted/30 to-muted/20 dark:from-amber-950/20'
        )}
      >
        <div className="transition-transform duration-200 group-hover:scale-105">
          <EmojiOrImageBadge
            value={skill.emoji}
            frameClassName="h-24 w-24 text-5xl drop-shadow-sm sm:h-28 sm:w-28 sm:text-6xl"
          />
        </div>

        {skill.status === 'completed' ? (
          <span className="absolute left-3 top-3 rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-semibold text-green-600">
            Completed
          </span>
        ) : skill.progress > 0 ? (
          <span className="absolute left-3 top-3 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {skill.progress}%
          </span>
        ) : null}

        {isPremiumLocked ? (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-linear-to-r from-amber-400 to-orange-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
            <Sparkles className="size-3" />
            Premium
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="space-y-1.5">
          <h3 className="text-base font-semibold leading-snug tracking-tight text-foreground sm:text-lg">
            {skill.title}
          </h3>
          {skill.duration ? (
            <p className="text-xs font-medium text-muted-foreground sm:text-sm">{skill.duration}</p>
          ) : null}
        </div>

        <span
          className={cn(
            buttonVariants({
              size: 'lg',
              variant: isPremiumLocked ? 'outline' : 'default',
            }),
            'mt-auto w-full rounded-xl'
          )}
        >
          {isPremiumLocked ? 'Unlock with Premium' : ctaLabel(skill)}
        </span>
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
    <Link
      to={
        skill.status === 'completed'
          ? `/academy/courses/${skill.id}`
          : `/skills/${skill.id}`
      }
      className={sharedClass}
    >
      {body}
    </Link>
  )
}
