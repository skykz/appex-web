import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Lock, Sparkles } from 'lucide-react'
import { cn } from '@shared/lib'
import { EmojiOrImageBadge } from '@shared/ui/emoji-or-image-badge'
import { PaywallDialog } from '@features/skills/paywall-dialog'
import type { CourseMapLessonRow, CourseMapOutline } from './course-outline'

type CourseMapLessonListProps = {
  outline: CourseMapOutline
  /** When set, clicking a lesson navigates with react-router. Omit for controlled selection. */
  navigateOnSelect?: boolean
  onSelectLesson?: (lessonId: number) => void
  /** Tighter padding for embedded panel vs sheet body. */
  density?: 'comfortable' | 'compact'
}

/**
 * Renders grouped module headings and lesson rows (lock, done, current) for course navigation.
 */
export function CourseMapLessonList({
  outline,
  navigateOnSelect = true,
  onSelectLesson,
  density = 'comfortable',
}: CourseMapLessonListProps) {
  const navigate = useNavigate()
  // Paywall is opened by a click on a `locked_reason='premium'` row.
  // We keep the blocked lesson's title around so the modal can name it.
  const [paywallFor, setPaywallFor] = useState<string | null>(null)

  const moduleGroups = useMemo(() => {
    const groups: { moduleTitle: string; rows: CourseMapLessonRow[] }[] = []
    for (const row of outline.lessons) {
      const tail = groups[groups.length - 1]
      if (!tail || tail.moduleTitle !== row.moduleTitle) {
        groups.push({ moduleTitle: row.moduleTitle, rows: [row] })
      } else {
        tail.rows.push(row)
      }
    }
    return groups
  }, [outline.lessons])

  const py = density === 'compact' ? 'py-1.5' : 'py-2.5'
  const px = density === 'compact' ? 'px-2' : 'px-2.5'

  /**
   * Opens another lesson in the course (or notifies parent).
   */
  function activateLesson(lessonId: number) {
    if (onSelectLesson) {
      onSelectLesson(lessonId)
      return
    }
    if (navigateOnSelect) {
      navigate(outline.hrefForLesson(lessonId))
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {moduleGroups.map((group) => (
        <section key={group.moduleTitle}>
          <p className="text-muted-foreground px-1 pb-0.5 text-[10px] font-bold uppercase tracking-wide">
            {group.moduleTitle}
          </p>
          <ol className="flex flex-col gap-0.5">
            {group.rows.map((row) => {
              const isCurrent = row.lessonId === outline.currentLessonId
              const isPremiumLocked = row.locked && row.locked_reason === 'premium'
              // Premium-locked rows are clickable (opens paywall); sequence-locked rows are disabled.
              const sequenceLocked = row.locked && !isPremiumLocked
              return (
                <li key={row.lessonId} className="list-none">
                  <button
                    type="button"
                    disabled={sequenceLocked}
                    onClick={() => {
                      if (sequenceLocked) return
                      if (isPremiumLocked) {
                        setPaywallFor(row.title)
                        return
                      }
                      activateLesson(row.lessonId)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg border text-left transition-colors',
                      px,
                      py,
                      sequenceLocked
                        ? 'cursor-not-allowed border-transparent bg-muted/20 opacity-55'
                        : isPremiumLocked
                          ? 'border-amber-400/30 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 dark:from-amber-950/20 dark:to-orange-950/20 dark:hover:from-amber-950/40'
                          : isCurrent
                            ? 'border-primary/35 bg-primary/[0.06]'
                            : 'border-transparent hover:bg-muted/60'
                    )}
                  >
                    <EmojiOrImageBadge
                      value={row.emoji}
                      frameClassName="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/70 text-base"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="text-muted-foreground block text-[9px] font-medium uppercase tracking-wide">
                        {row.label}
                      </span>
                      <span className="line-clamp-2 text-xs font-semibold leading-snug">
                        {row.title}
                      </span>
                    </span>
                    {isPremiumLocked ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm">
                        <Sparkles className="size-2.5" />
                        Premium
                      </span>
                    ) : sequenceLocked ? (
                      <Lock className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
                    ) : row.completed ? (
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                        <Check className="size-3" strokeWidth={3} aria-hidden />
                      </span>
                    ) : isCurrent ? (
                      <span className="bg-primary text-primary-foreground shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold">
                        Here
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ol>
        </section>
      ))}
      <PaywallDialog
        open={paywallFor !== null}
        onOpenChange={(open) => {
          if (!open) setPaywallFor(null)
        }}
        blockedContent={paywallFor ?? undefined}
      />
    </div>
  )
}
