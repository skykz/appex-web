import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronUp, ChevronDown, Lock } from 'lucide-react'
import { cn } from '@shared/lib'
import { mockSkills, type SkillModule } from '@features/skills'

export default function SkillDetailPage() {
  const { skillId } = useParams<{ skillId: string }>()
  const navigate = useNavigate()
  const skill = mockSkills.find((s) => s.id === Number(skillId))

  const [aboutExpanded, setAboutExpanded] = useState(false)

  if (!skill) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-muted-foreground">Skill not found</p>
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
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-1.5 text-sm">
          <Link
            to="/skills"
            className="text-primary font-medium transition-colors hover:text-primary/80"
          >
            Skills
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">{skill.title}</span>
        </div>

        {/* Main two-column layout */}
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Left column: Hero card + About */}
          <div className="flex-1 min-w-0">
            {/* Hero card */}
            <div className="overflow-hidden rounded-2xl border bg-card">
              {/* Emoji illustration area */}
              <div className="flex h-56 items-center justify-center bg-muted/40">
                <span className="text-8xl">{skill.emoji}</span>
              </div>

              {/* Card body */}
              <div className="p-5">
                <h1 className="text-xl font-bold">{skill.title}</h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {skill.description}
                </p>

                {/* Progress bar */}
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

                {/* CTA button */}
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

            {/* About this course */}
            <div className="mt-8">
              <h2 className="text-lg font-bold">About this course</h2>

              {/* Meta badges */}
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border px-3 py-1 text-xs font-medium text-primary">
                  {totalLessons} lessons
                </span>
                <span className="rounded-full border px-3 py-1 text-xs font-medium text-primary">
                  {skill.duration}
                </span>
              </div>

              {/* Description */}
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

          {/* Right column: Module / Lessons sidebar */}
          <div className="w-full lg:w-80 xl:w-96 shrink-0">
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
    <div className="rounded-2xl border bg-card">
      {/* Module header */}
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
          <ChevronUp className="size-5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-5 shrink-0 text-muted-foreground" />
        )}
      </button>

      {/* Lessons list */}
      {open && (
        <div className="flex flex-col gap-1 px-3 pb-3">
          {module.lessons.map((lesson) => {
            const content = (
              <>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/50 text-xl">
                  {lesson.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{lesson.label}</p>
                  <p className="text-sm font-semibold leading-tight">
                    {lesson.title}
                  </p>
                </div>
                {lesson.locked && (
                  <Lock className="size-4 shrink-0 text-muted-foreground/40" />
                )}
              </>
            )

            if (lesson.locked) {
              return (
                <div
                  key={lesson.id}
                  className="flex items-center gap-3 rounded-xl p-3 opacity-60 cursor-not-allowed"
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
