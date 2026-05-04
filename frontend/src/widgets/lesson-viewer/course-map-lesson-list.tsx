import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Lock } from 'lucide-react'
import { cn } from '@shared/lib'
import { EmojiOrImageBadge } from '@shared/ui/emoji-or-image-badge'
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
              return (
                <li key={row.lessonId} className="list-none">
                  <button
                    type="button"
                    disabled={row.locked}
                    onClick={() => !row.locked && activateLesson(row.lessonId)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg border text-left transition-colors',
                      px,
                      py,
                      row.locked
                        ? 'cursor-not-allowed border-transparent bg-muted/20 opacity-55'
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
                    {row.locked ? (
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
    </div>
  )
}
