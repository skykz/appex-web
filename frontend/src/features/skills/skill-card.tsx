import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { cn } from '@shared/lib'
import { EmojiOrImageBadge } from '@shared/ui/emoji-or-image-badge'
import { isLikelyImageBadgeUrl } from '@appex/lesson-schema'
import type { SkillCardModel } from './types'
import { PaywallDialog } from './paywall-dialog'

interface SkillCardProps {
  skill: SkillCardModel
  /** Featured challenge cards can span a narrower column on large screens. */
  featured?: boolean
  /** Small card used in the featured-skills strip. */
  compact?: boolean
}

/**
 * Course card used in the skills catalog sections.
 */
export function SkillCard({ skill, featured = false, compact = false }: SkillCardProps) {
  const [paywallOpen, setPaywallOpen] = useState(false)
  const isPremiumLocked = !!skill.premium_locked
  const progress = Math.max(0, Math.min(100, Math.round(skill.progress)))
  const hasCourseImage = isLikelyImageBadgeUrl(skill.emoji)

  const sharedClass = cn(
    'group flex h-full flex-col text-left transition-transform duration-200 hover:-translate-y-0.5',
    compact ? 'min-w-0' : 'min-w-0',
    featured && !compact && 'max-w-none'
  )

  const body = (
    <>
      <div
        className={cn(
          'relative flex aspect-[16/10] items-center justify-center bg-muted/35',
          compact && 'aspect-[16/9] rounded-[16px] border border-border/50',
          isPremiumLocked && 'bg-linear-to-b from-amber-50/80 via-muted/30 to-muted/20 dark:from-amber-950/20'
        )}
      >
        <div
          className={cn(
            'transition-transform duration-200 group-hover:scale-[1.02]',
            hasCourseImage
              ? cn('absolute rounded-[18px] bg-white p-1.5 shadow-sm', compact ? 'inset-2' : 'inset-3')
              : 'group-hover:scale-105'
          )}
        >
          <EmojiOrImageBadge
            value={skill.emoji}
            frameClassName={
              hasCourseImage
                ? 'h-full w-full rounded-[13px] text-base'
                : cn(
                    'h-24 w-24 text-5xl drop-shadow-sm sm:h-28 sm:w-28 sm:text-6xl',
                    compact && 'h-14 w-14 text-2xl sm:h-16 sm:w-16 sm:text-3xl'
                  )
            }
            imageClassName={hasCourseImage ? 'object-cover scale-[0.94]' : undefined}
          />
        </div>

        {!compact ? (
          <span className="absolute left-3 top-3 inline-flex size-10 items-center justify-center rounded-full border border-border/60 bg-background text-xs font-bold text-foreground shadow-sm">
            {skill.status === 'completed' ? '✓' : `${progress}%`}
          </span>
        ) : null}

        {isPremiumLocked ? (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-linear-to-r from-amber-400 to-orange-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
            <Sparkles className="size-3" />
            Premium
          </span>
        ) : null}
      </div>

      <div className={cn('flex flex-1 flex-col', compact ? 'gap-2 px-1 pb-1 pt-3' : 'gap-2 pt-3')}>
        <div className="space-y-1.5">
          {!compact ? (
            <h3 className="text-base font-semibold leading-snug tracking-tight text-foreground sm:text-lg">
              {skill.title}
            </h3>
          ) : null}
          {!compact ? <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{skill.description}</p> : null}
        </div>
        {compact ? (
          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            <span className="line-clamp-1 text-sm font-semibold text-foreground">{skill.title}</span>
            <ArrowRight className="size-4 shrink-0 text-foreground transition-transform duration-200 group-hover:translate-x-1" />
          </div>
        ) : null}
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
