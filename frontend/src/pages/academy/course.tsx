import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Check,
  Clock3,
  Download,
  Flag,
  Lock,
  Map,
  Play,
  Route,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { cn } from '@shared/lib'
import { EmojiOrImageBadge } from '@shared/ui/emoji-or-image-badge'
import { PageLoader } from '@shared/ui'
import { skillsApi } from '@features/skills'
import { downloadCertificate, certificateToDownloadData } from '@features/skills/certificate-download'
import type { SkillLesson, SkillModule } from '@features/skills'
import { useAuthStore } from '@entities/user'

const moduleTones = [
  {
    area: 'from-indigo-500/14 via-violet-500/8 to-sky-500/10',
    ring: 'border-indigo-200/80 dark:border-indigo-500/25',
    marker: 'bg-indigo-500 text-white shadow-indigo-500/25',
    soft: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  },
  {
    area: 'from-emerald-500/14 via-teal-500/8 to-cyan-500/10',
    ring: 'border-emerald-200/80 dark:border-emerald-500/25',
    marker: 'bg-emerald-500 text-white shadow-emerald-500/25',
    soft: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  {
    area: 'from-orange-500/14 via-amber-500/8 to-rose-500/10',
    ring: 'border-orange-200/80 dark:border-orange-500/25',
    marker: 'bg-orange-500 text-white shadow-orange-500/25',
    soft: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  },
  {
    area: 'from-fuchsia-500/14 via-pink-500/8 to-purple-500/10',
    ring: 'border-fuchsia-200/80 dark:border-fuchsia-500/25',
    marker: 'bg-fuchsia-500 text-white shadow-fuchsia-500/25',
    soft: 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300',
  },
]

/**
 * Returns a repeating visual tone so each module reads as its own map area.
 */
function getModuleTone(index: number) {
  return moduleTones[index % moduleTones.length]
}

/**
 * Counts completed and total lessons for a module progress badge.
 */
function getModuleStats(module: SkillModule) {
  const total = module.lessons.length
  const completed = module.lessons.filter((lesson) => lesson.completed).length
  return { total, completed, percent: total ? Math.round((completed / total) * 100) : 0 }
}

/**
 * Finds the first playable unfinished lesson to mark as the next level.
 */
function getNextLessonId(modules: SkillModule[]) {
  for (const module of modules) {
    const next = module.lessons.find(
      (lesson) => !lesson.locked && !(lesson.completed ?? false)
    )
    if (next) return next.id
  }
  return null
}

/**
 * Converts lesson flags into a small UI state for the level node.
 */
function getLessonState(lesson: SkillLesson, nextLessonId: number | null) {
  if (lesson.locked) return 'locked'
  if (lesson.completed) return 'completed'
  if (lesson.id === nextLessonId) return 'current'
  return 'open'
}

/**
 * Academy course view — `courseId` is the same numeric id as skills in the database.
 */
export default function CoursePage() {
  const { courseId } = useParams<{ courseId: string }>()
  const id = Number(courseId)
  const userName = useAuthStore((s) => s.user?.name)

  const { data: course, isPending, isError, refetch } = useQuery({
    queryKey: ['skill', id],
    queryFn: () => skillsApi.getDetail(id),
    enabled: Number.isFinite(id),
  })

  if (!Number.isFinite(id)) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-muted-foreground text-sm">Invalid course</p>
      </div>
    )
  }

  if (isPending) {
    return <PageLoader label="Loading course…" />
  }

  if (isError || !course) {
    return (
      <div className="relative mx-auto flex min-h-dvh w-full max-w-2xl flex-col items-center justify-center gap-4 px-4 py-12">
        <p className="text-center text-sm text-muted-foreground">
          Course not found.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          Retry
        </button>
        <Link to="/home" className="text-primary text-sm font-medium">
          Back to home
        </Link>
      </div>
    )
  }

  const nextLessonId = getNextLessonId(course.modules)
  const totalLessons = course.modules.reduce(
    (sum, module) => sum + module.lessons.length,
    0
  )
  const completedLessons = course.modules.reduce(
    (sum, module) =>
      sum + module.lessons.filter((lesson) => lesson.completed).length,
    0
  )

  return (
    <div className="relative isolate min-h-dvh w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-x-0 top-0 h-80 bg-linear-to-b from-primary/[0.08] via-orange-500/[0.04] to-transparent" />
        <div className="absolute left-[8%] top-32 size-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-[4%] top-10 size-80 rounded-full bg-orange-400/10 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            to="/home"
            className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1.5 text-sm font-medium shadow-sm backdrop-blur transition-colors"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to Home
          </Link>

          <section className="relative overflow-hidden rounded-3xl border bg-card/85 p-4 shadow-xl shadow-black/[0.04] ring-1 ring-white/60 backdrop-blur dark:ring-white/10 sm:rounded-[2rem] sm:p-6 lg:p-8">
            <div className="absolute -right-16 -top-20 size-56 rounded-full bg-primary/10 blur-2xl" aria-hidden />
            <div className="absolute -bottom-24 left-20 size-64 rounded-full bg-orange-400/10 blur-2xl" aria-hidden />

            <div className="relative grid gap-4 lg:grid-cols-[1fr_18rem] lg:items-end lg:gap-6">
              <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                <EmojiOrImageBadge
                  value={course.emoji}
                  frameClassName="size-12 shrink-0 rounded-2xl bg-linear-to-br from-background to-muted text-2xl shadow-inner ring-1 ring-border sm:size-16 sm:text-3xl"
                />
                <div className="min-w-0">
                  <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-primary/[0.08] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary sm:mb-2 sm:px-3 sm:py-1 sm:text-xs">
                    <Map className="size-3.5" aria-hidden />
                    Learning map
                  </div>
                  <h1 className="text-xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                    {course.title}
                  </h1>
                  <p className="text-muted-foreground mt-1.5 max-w-2xl text-[13px] leading-relaxed sm:mt-2 sm:text-sm">
                    {course.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold sm:mt-4 sm:gap-2 sm:text-xs">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-muted-foreground sm:px-3">
                      <Trophy className="size-3.5" aria-hidden />
                      {course.progress}% complete
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-muted-foreground sm:px-3">
                      <Clock3 className="size-3.5" aria-hidden />
                      {course.duration}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-muted-foreground sm:px-3">
                      <Flag className="size-3.5" aria-hidden />
                      {completedLessons}/{totalLessons} levels cleared
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-background/75 p-3.5 shadow-sm sm:p-4">
                <div className="mb-2.5 flex items-center justify-between gap-3 sm:mb-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground sm:text-xs">
                    Course progress
                  </p>
                  <p className="text-lg font-bold tabular-nums sm:text-2xl">{course.progress}%</p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted sm:h-3">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-indigo-500 via-violet-500 to-orange-400"
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground sm:text-xs">
                  Clear each level to unlock the next area.
                </p>
                {course.certificate && (
                  <button
                    type="button"
                    onClick={() =>
                      course.certificate &&
                      void downloadCertificate(
                        certificateToDownloadData(course.certificate, userName)
                      )
                    }
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
                  >
                    <Download className="size-4" />
                    Download certificate
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-6 pb-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="flex min-w-0 flex-col gap-6">
            {course.modules.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed bg-muted/30 p-10 text-center">
                <p className="text-sm text-muted-foreground">
                  No lessons in this course yet.
                </p>
              </div>
            ) : null}
            {course.modules.map((module, moduleIndex) => {
              const tone = getModuleTone(moduleIndex)
              const stats = getModuleStats(module)

              return (
                <section
                  key={module.id}
                  className={cn(
                    'relative overflow-hidden rounded-[2rem] border bg-linear-to-br p-4 shadow-lg shadow-black/[0.03] sm:p-5',
                    tone.area,
                    tone.ring
                  )}
                >
                  <div className="absolute right-8 top-8 size-24 rounded-full bg-white/35 blur-2xl dark:bg-white/5" aria-hidden />
                  <div className="absolute bottom-5 left-8 size-20 rounded-full bg-black/[0.03] blur-2xl dark:bg-white/[0.03]" aria-hidden />

                  <div className="relative mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-lg', tone.marker)}>
                        <Route className="size-5" aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <p className={cn('mb-1 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide', tone.soft)}>
                          Area {moduleIndex + 1}
                        </p>
                        <h2 className="text-lg font-bold tracking-tight sm:text-xl">
                          {module.title}
                        </h2>
                        <p className="text-muted-foreground text-sm">
                          {stats.completed}/{stats.total || module.lessonCount} levels cleared
                        </p>
                      </div>
                    </div>

                    <div className="w-full shrink-0 rounded-2xl border bg-background/70 p-3 shadow-sm backdrop-blur lg:w-44">
                      <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
                        <span>Area progress</span>
                        <span className="tabular-nums">{stats.percent}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-foreground/80"
                          style={{ width: `${stats.percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <ol className="relative grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {module.lessons.map((lesson) => {
                      const state = getLessonState(lesson, nextLessonId)
                      const isLocked = state === 'locked'
                      const isCompleted = state === 'completed'
                      const isCurrent = state === 'current'
                      const content = (
                        <>
                          <div className="min-w-0 flex-1">
                            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                              <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wide">
                                {lesson.label}
                              </span>
                              {isCompleted ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                  <Check className="size-3" aria-hidden />
                                  Done
                                </span>
                              ) : isCurrent ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-bold text-primary">
                                  <Sparkles className="size-3" aria-hidden />
                                  Next
                                </span>
                              ) : isLocked ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                                  <Lock className="size-3" aria-hidden />
                                  Locked
                                </span>
                              ) : null}
                            </div>
                            <p
                              className={cn(
                                'line-clamp-2 text-sm font-bold leading-snug',
                                isLocked && 'text-muted-foreground'
                              )}
                            >
                              {lesson.title}
                            </p>
                            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                              {isLocked
                                ? 'Finish earlier levels to unlock.'
                                : isCompleted
                                  ? 'Level cleared.'
                                  : isCurrent
                                    ? 'Recommended next step.'
                                    : 'Available level.'}
                            </p>
                          </div>

                          {/* Trailing affordance — only the actionable states get a play CTA. */}
                          {!isLocked && !isCompleted ? (
                            <div className="shrink-0 self-center">
                              <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm shadow-primary/25 transition-transform group-hover:scale-110">
                                <Play className="size-4 fill-current" aria-hidden />
                              </span>
                            </div>
                          ) : null}
                        </>
                      )

                      return (
                        <li key={lesson.id} className="list-none">
                          {isLocked ? (
                            <div className="flex h-full min-h-[7.5rem] cursor-not-allowed items-center gap-3 rounded-3xl border border-border/50 bg-background/40 p-4">
                              {content}
                            </div>
                          ) : (
                            <Link
                              to={`/academy/courses/${courseId}/lessons/${lesson.id}`}
                              className={cn(
                                'group flex h-full min-h-[7.5rem] items-center gap-3 rounded-3xl border bg-background/80 p-4 shadow-sm backdrop-blur transition-all duration-200',
                                isCurrent
                                  ? 'border-primary/50 ring-4 ring-primary/10 hover:shadow-md'
                                  : 'border-white/70 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md dark:border-white/10'
                              )}
                            >
                              {content}
                            </Link>
                          )}
                        </li>
                      )
                    })}
                  </ol>
                </section>
              )
            })}
          </div>

          <aside className="lg:sticky lg:top-4">
            <div className="rounded-[2rem] border bg-card/85 p-5 shadow-xl shadow-black/[0.04] ring-1 ring-white/60 backdrop-blur dark:ring-white/10">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Route className="size-5" aria-hidden />
                </div>
                <div>
                  <h2 className="font-bold">Course route</h2>
                  <p className="text-xs text-muted-foreground">
                    Modules as areas, lessons as levels.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {course.modules.map((module, index) => {
                  const tone = getModuleTone(index)
                  const stats = getModuleStats(module)

                  return (
                    <div key={module.id} className="rounded-2xl border bg-background/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold shadow-sm', tone.marker)}>
                            {index + 1}
                          </span>
                          <p className="truncate text-sm font-semibold">
                            {module.title}
                          </p>
                        </div>
                        <span className="text-xs font-bold tabular-nums text-muted-foreground">
                          {stats.percent}%
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-foreground/75"
                          style={{ width: `${stats.percent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
