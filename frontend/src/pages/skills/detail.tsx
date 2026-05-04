import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, ChevronUp, ChevronDown, Lock } from 'lucide-react'
import { cn } from '@shared/lib'
import { EmojiOrImageBadge } from '@shared/ui/emoji-or-image-badge'
import { skillsApi, type SkillModule } from '@features/skills'

/**
 * Single skill (course) overview with expandable modules and lesson links.
 */
export default function SkillDetailPage() {
  const { skillId } = useParams<{ skillId: string }>()
  const navigate = useNavigate()
  const id = Number(skillId)

  const { data: skill, isPending, isError, refetch } = useQuery({
    queryKey: ['skill', id],
    queryFn: () => skillsApi.getDetail(id),
    enabled: Number.isFinite(id),
  })

  const [aboutExpanded, setAboutExpanded] = useState(false)

  if (!Number.isFinite(id)) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-muted-foreground text-sm">Invalid course link</p>
      </div>
    )
  }

  if (isPending) {
    return (
      <div className="relative min-h-dvh w-full animate-pulse py-2">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-6 h-4 w-24 rounded bg-muted" />
          <div className="flex flex-col gap-8 lg:flex-row">
            <div className="flex-1 space-y-4">
              <div className="h-56 rounded-2xl bg-muted" />
              <div className="h-32 rounded-xl bg-muted" />
            </div>
            <div className="h-96 w-full shrink-0 rounded-2xl bg-muted lg:w-80" />
          </div>
        </div>
      </div>
    )
  }

  if (isError || !skill) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground text-center text-sm">
          Course not found or unavailable.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          Retry
        </button>
        <Link to="/skills" className="text-primary text-sm font-medium">
          Back to skills
        </Link>
      </div>
    )
  }

  const totalLessons = skill.modules.reduce(
    (sum, m) => sum + m.lessonCount,
    0
  )

  return (
    <div className="relative min-h-dvh w-full py-2">
      <div className="px-4">
        <div className="mb-6 flex items-center gap-1.5 text-sm">
          <Link
            to="/skills"
            className="text-primary font-medium transition-colors hover:text-primary/80"
          >
            Skills
          </Link>
          <ChevronRight className="text-muted-foreground size-3.5" />
          <span className="text-muted-foreground">{skill.title}</span>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="min-w-0 flex-1">
            <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <div className="flex h-56 items-center justify-center bg-gradient-to-br from-muted/60 to-muted/20">
                <EmojiOrImageBadge value={skill.emoji} frameClassName="h-32 w-32 text-8xl" />
              </div>

              <div className="p-5">
                <h1 className="text-xl font-bold">{skill.title}</h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {skill.description}
                </p>

                <div className="mt-4 flex items-center gap-3">
                  <div className="h-1.5 flex-1 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${skill.progress}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {skill.progress}%
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const firstUnlocked = skill.modules
                      .flatMap((m) => m.lessons)
                      .find((l) => !l.locked)
                    if (firstUnlocked) {
                      navigate(`/skills/${skill.id}/lessons/${firstUnlocked.id}`)
                    }
                  }}
                  className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] sm:w-auto sm:px-8"
                >
                  {skill.status === 'completed'
                    ? 'Review course'
                    : skill.status === 'in_progress'
                      ? 'Continue'
                      : 'Start course'}
                </button>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-bold">About this course</h2>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border px-3 py-1 text-xs font-medium text-primary">
                  {totalLessons} lessons
                </span>
                <span className="rounded-full border px-3 py-1 text-xs font-medium text-primary">
                  {skill.duration}
                </span>
              </div>

              <p
                className={cn(
                  'mt-3 text-sm leading-relaxed text-muted-foreground',
                  !aboutExpanded && 'line-clamp-3'
                )}
              >
                {skill.about}
              </p>
              {skill.about.length > 150 && (
                <button
                  type="button"
                  onClick={() => setAboutExpanded(!aboutExpanded)}
                  className="mt-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                >
                  {aboutExpanded ? 'Show less' : 'See more'}
                </button>
              )}
            </div>
          </div>

          <div className="w-full shrink-0 lg:w-80 xl:w-96">
            {skill.modules.map((mod) => (
              <ModuleSection key={mod.id} module={mod} skillId={skill.id} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ModuleSection({
  module,
  skillId,
}: {
  module: SkillModule
  skillId: number
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="mb-3 rounded-2xl border bg-card shadow-sm last:mb-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div>
          <h3 className="font-semibold leading-tight">{module.title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {module.lessonCount} lessons
          </p>
        </div>
        {open ? (
          <ChevronUp className="text-muted-foreground size-5 shrink-0" />
        ) : (
          <ChevronDown className="text-muted-foreground size-5 shrink-0" />
        )}
      </button>

      {open && (
        <div className="flex flex-col gap-1 px-3 pb-3">
          {module.lessons.map((lesson) => {
            const content = (
              <>
                <EmojiOrImageBadge
                  value={lesson.emoji}
                  frameClassName="size-10 shrink-0 rounded-xl bg-muted/50 text-xl"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{lesson.label}</p>
                  <p className="text-sm font-semibold leading-tight">
                    {lesson.title}
                  </p>
                </div>
                {lesson.locked && (
                  <Lock className="text-muted-foreground/40 size-4 shrink-0" />
                )}
              </>
            )

            if (lesson.locked) {
              return (
                <div
                  key={lesson.id}
                  className="flex cursor-not-allowed items-center gap-3 rounded-xl p-3 opacity-60"
                >
                  {content}
                </div>
              )
            }

            return (
              <Link
                key={lesson.id}
                to={`/skills/${skillId}/lessons/${lesson.id}`}
                className="flex items-center gap-3 rounded-xl p-3 transition-all duration-200 hover:bg-muted/60"
              >
                {content}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
