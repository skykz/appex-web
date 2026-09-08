import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { cn } from '@shared/lib'
import { EmojiOrImageBadge } from '@shared/ui/emoji-or-image-badge'
import { isLikelyImageBadgeUrl } from '@appex/lesson-schema'
import type { SkillCardModel } from './types'
import { PaywallDialog } from './paywall-dialog'

interface SkillCardProps {
  skill: SkillCardModel
}

/**
 * Course card used in the skills catalog sections.
 */
export function SkillCard({ skill }: SkillCardProps) {
  const [paywallOpen, setPaywallOpen] = useState(false)
  const isPremiumLocked = !!skill.premium_locked
  const progress = Math.max(0, Math.min(100, Math.round(skill.progress)))
  const hasCourseImage = isLikelyImageBadgeUrl(skill.emoji)

  const sharedClass = 'group flex h-full min-w-0 flex-col text-left transition-transform duration-200 hover:-translate-y-0.5'

  const body = (
    <>
      <div
        className={cn(
          'relative flex aspect-[16/10] items-center justify-center bg-muted/35',
          isPremiumLocked && 'bg-linear-to-b from-amber-50/80 via-muted/30 to-muted/20 dark:from-amber-950/20'
        )}
      >
        <div
          className={cn(
            'transition-transform duration-200 group-hover:scale-[1.02]',
            hasCourseImage
              ? 'absolute inset-3 rounded-[18px] bg-white p-1.5 shadow-sm'
              : 'group-hover:scale-105'
          )}
        >
          <EmojiOrImageBadge
            value={skill.emoji}
            frameClassName={
              hasCourseImage
                ? 'h-full w-full rounded-[13px] text-base'
                : 'h-24 w-24 text-5xl drop-shadow-sm sm:h-28 sm:w-28 sm:text-6xl'
            }
            imageClassName={hasCourseImage ? 'object-cover scale-[0.94]' : undefined}
          />
        </div>

        <span className="absolute left-3 top-3 inline-flex size-10 items-center justify-center rounded-full border border-border/60 bg-background text-xs font-bold text-foreground shadow-sm">
          {skill.status === 'completed' ? '✓' : `${progress}%`}
        </span>

        {isPremiumLocked ? (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-linear-to-r from-amber-400 to-orange-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
            <Sparkles className="size-3" />
            Premium
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 pt-3">
        <div className="space-y-1.5">
          <h3 className="text-base font-semibold leading-snug tracking-tight text-foreground sm:text-lg">
            {skill.title}
          </h3>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{skill.description}</p>
        </div>
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
