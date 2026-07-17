import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Play, Check, Lock, Sparkles } from 'lucide-react'
import { cn } from '@shared/lib'
import { EmojiOrImageBadge } from '@shared/ui/emoji-or-image-badge'
import { ProgressCard, SectionLoader, Skeleton } from '@shared/ui'
import { skillsApi, type SkillDetail, type SkillListItem } from '@features/skills'
import { HomeStreakPromoSection } from '@/widgets/home-streak-promo-section'

/**
 * Picks the skill to highlight on the home “continue learning” rail.
 */
function pickFeaturedSkillId(skills: SkillListItem[]): number | null {
  if (!skills.length) return null
  const inProgress = skills.find((s) => s.status === 'in_progress')
  if (inProgress) return inProgress.id
  const next = skills.find((s) => s.status === 'not_started')
  if (next) return next.id
  return skills[0].id
}

/**
 * Picks one resume lesson per course so recent activity does not repeat the same course.
 */
function pickResumeLesson(course: SkillDetail) {
  const orderedLessons = course.modules.flatMap((module) => module.lessons)
  const next = orderedLessons.find((lesson) => !lesson.locked && !(lesson.completed ?? false))
  return next ?? orderedLessons.find((lesson) => !lesson.locked) ?? null
}

/**
 * Home dashboard — real progress, streak, and course data from the API.
 */
export default function HomePage() {
  const { data: courses = [], isPending: coursesLoading } = useQuery({
    queryKey: ['skills', 'all'],
    queryFn: () => skillsApi.list('all'),
  })

  const featuredId = useMemo(() => pickFeaturedSkillId(courses), [courses])
  const featuredCourse = useMemo(
    () => courses.find((course) => course.id === featuredId) ?? null,
    [courses, featuredId]
  )

  const activeCourseIds = useMemo(() => {
    const active = courses
      .filter((course) => course.status === 'in_progress' || course.progress > 0)
      .map((course) => course.id)
    return active.length ? active : featuredId != null ? [featuredId] : []
  }, [courses, featuredId])

  const activityQueries = useQueries({
    queries: activeCourseIds.map((id) => ({
      queryKey: ['skill', id],
      queryFn: () => skillsApi.getDetail(id),
      enabled: Number.isFinite(id),
    })),
  })

  const planProgress = useMemo(() => {
    if (!courses.length) return 0
    const sum = courses.reduce((acc, s) => acc + s.progress, 0)
    return Math.round(sum / courses.length)
  }, [courses])
  const activityCourses = useMemo(
    () =>
      activityQueries
        .map((query) => query.data)
        .filter((course): course is SkillDetail => Boolean(course)),
    [activityQueries]
  )
  const activitiesLoading = activityQueries.some((query) => query.isPending)

  return (
    <>
      <div className="relative isolate min-h-dvh w-full">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-90"
          aria-hidden
        >
          <div className="absolute inset-x-0 top-0 h-72 bg-linear-to-b from-primary/[0.07] via-transparent to-transparent" />
        </div>

        <div className="relative mx-auto w-full max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(19rem,22rem)] lg:items-start lg:gap-x-0">
            <div className="min-w-0 w-full max-w-2xl space-y-8 lg:max-w-none lg:pr-10">
              <header className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-sidebar-accent text-sidebar-accent-foreground rounded-full px-3 py-1 text-xs font-semibold tracking-wide">
                    Personal plan
                  </span>
                  <span className="hidden items-center gap-1 rounded-full border border-primary/15 bg-primary/[0.04] px-2.5 py-0.5 text-xs font-medium text-primary sm:inline-flex">
                    <Sparkles className="size-3" />
                    Live data
                  </span>
                </div>

                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    Learn AI &amp; automation
                  </h1>
                </div>
              </header>

              <section>
                <div className="mb-3 flex items-end justify-between gap-2">
                  <h2 className="text-lg font-semibold">Your courses</h2>
                  <Link
                    to="/skills"
                    className="text-primary text-sm font-medium hover:underline"
                  >
                    Browse all
                  </Link>
                </div>
                {coursesLoading ? (
                  <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex min-w-[220px] max-w-[260px] shrink-0 flex-col justify-between rounded-2xl border bg-card p-4 shadow-sm"
                      >
                        <div className="mb-3 flex items-start gap-3">
                          <Skeleton className="h-10 w-10 rounded-xl" />
                          <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                            <Skeleton className="h-3.5 w-full rounded-md" />
                            <Skeleton className="h-3.5 w-2/3 rounded-md" />
                          </div>
                        </div>
                        <div className="flex items-end justify-between gap-2 border-t border-border/60 pt-3">
                          <Skeleton className="h-3 w-10 rounded-md" />
                          <Skeleton className="size-9 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : courses.length === 0 ? (
                  <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No courses yet. Ask your admin to publish skills in the
                      console.
                    </p>
                    <Link
                      to="/skills"
                      className="text-primary mt-3 inline-block text-sm font-semibold"
                    >
                      Open skills
                    </Link>
                  </div>
                ) : (
                  <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-2">
                    {courses.map((course) => (
                      <Link
                        key={course.id}
                        to={`/academy/courses/${course.id}`}
                        className={cn(
                          'relative flex min-w-[220px] max-w-[260px] shrink-0 flex-col justify-between rounded-2xl border bg-card p-4 shadow-sm transition-all',
                          'hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md'
                        )}
                      >
                        <div className="mb-3 flex items-start gap-3">
                          <EmojiOrImageBadge value={course.emoji} frameClassName="h-10 w-10 text-3xl" />
                          <h3 className="line-clamp-3 text-left text-sm font-semibold leading-snug">
                            {course.title}
                          </h3>
                        </div>
                        <div className="flex items-end justify-between gap-2 border-t border-border/60 pt-3">
                          <span className="text-muted-foreground text-xs font-medium">
                            {course.progress > 0
                              ? `${course.progress}%`
                              : course.status === 'completed'
                                ? 'Done'
                                : 'Start'}
                          </span>
                          <div className="bg-primary/12 flex size-9 items-center justify-center rounded-full">
                            <Play className="text-primary size-4 fill-current" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              {activeCourseIds.length > 0 && (
                <section className="pb-12 lg:pb-24">
                  {activitiesLoading && activityCourses.length === 0 ? (
                    <SectionLoader className="py-8" label="Loading activity…" />
                  ) : (
                    <>
                      <div className="mb-4">
                        <h2 className="text-lg font-semibold">
                          Pick up where you left off
                        </h2>
                      </div>
                      <div className="flex flex-col gap-3">
                        {activityCourses.map((course) => {
                          const lesson = pickResumeLesson(course)
                          if (!lesson) return null
                            const done = Boolean(lesson.completed)
                            const active =
                              !lesson.locked &&
                              !done &&
                              course.status !== 'completed'

                            return (
                              <Link
                                key={course.id}
                                to={`/academy/courses/${course.id}/lessons/${lesson.id}`}
                                className={cn(
                                  'flex items-center justify-between rounded-2xl p-4 transition-all duration-200',
                                  active
                                    ? 'border-2 border-primary/35 bg-primary/[0.04] shadow-sm'
                                    : lesson.locked
                                      ? 'pointer-events-none border border-transparent bg-muted/30 opacity-60'
                                      : 'border border-transparent bg-muted/40 hover:bg-muted/70'
                                )}
                              >
                                <div className="flex min-w-0 items-center gap-4">
                                  <EmojiOrImageBadge
                                    value={lesson.emoji}
                                    frameClassName={cn(
                                      'size-12 shrink-0 rounded-2xl text-xl',
                                      active
                                        ? 'bg-primary text-primary-foreground shadow-inner'
                                        : done
                                          ? 'bg-primary/12 text-primary'
                                          : 'bg-background text-muted-foreground shadow-sm'
                                    )}
                                  />
                                  <div className="min-w-0 flex flex-col gap-0.5">
                                    <span className="truncate text-xs font-semibold text-primary">
                                      {course.title}
                                    </span>
                                    <span className="text-xs font-medium text-muted-foreground">
                                      {lesson.label}
                                    </span>
                                    <span
                                      className={cn(
                                        'truncate text-sm font-semibold',
                                        active || done
                                          ? 'text-foreground'
                                          : 'text-muted-foreground'
                                      )}
                                    >
                                      {lesson.title}
                                    </span>
                                  </div>
                                </div>
                                <div className="shrink-0">
                                  {done ? (
                                    <div className="flex size-7 items-center justify-center rounded-full border-2 border-emerald-500 text-emerald-600">
                                      <Check className="size-4 stroke-[2.5]" />
                                    </div>
                                  ) : lesson.locked ? (
                                    <Lock className="text-muted-foreground/30 size-5" />
                                  ) : null}
                                </div>
                              </Link>
                            )
                        })}
                      </div>
                    </>
                  )}
                </section>
              )}
            </div>

            <aside className="flex w-full max-w-md shrink-0 flex-col gap-3 lg:sticky lg:top-4 lg:w-full lg:max-w-none lg:self-start lg:border-l lg:border-border/80 lg:pl-10">
              <ProgressCard
                loading={coursesLoading}
                progress={planProgress}
                featuredTitle={featuredCourse?.title}
                featuredHref={
                  featuredCourse
                    ? `/academy/courses/${featuredCourse.id}`
                    : undefined
                }
              />
              <HomeStreakPromoSection />
            </aside>
          </div>
        </div>
      </div>
    </>
  )
}
