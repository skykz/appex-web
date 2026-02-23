import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Play,
  Map,
  Settings,
  Satellite,
  Check,
  Lock,
  ChevronRight,
  Flame,
} from 'lucide-react'
import { cn } from '@shared/lib'
import { ProgressCard } from '@shared/ui'
import { StreakSheet } from '@features/streak'

/**
 * Home page - personal plan dashboard with courses and progress.
 * Shows 4-week plan overview, progress tracking, and course modules.
 */
export default function HomePage() {
  const [streakOpen, setStreakOpen] = useState(false)

  const mockCourses = [
    { id: 33, title: 'Start Automation Journey', progress: 0 },
    { id: 34, title: 'Launch Inventory Agent', progress: 0 },
    { id: 35, title: 'Build Feedback Agent', progress: 0 },
    { id: 36, title: 'Build Analytics Agent', progress: 0 },
  ]

  const mockModules = [
    {
      id: 1,
      title: 'Module 1: Understand the Game',
      lessonCount: 7,
      lessons: [
        {
          id: 526,
          label: 'Lesson 1',
          title: 'Why you are here',
          completed: true,
          icon: Map,
          active: false,
        },
        {
          id: 527,
          label: 'Lesson 2',
          title: 'Meet n8n',
          completed: false,
          icon: Settings,
          active: true,
        },
        {
          id: 528,
          label: 'Lesson 3',
          title: 'Learn how automations work',
          completed: false,
          icon: Satellite,
          active: false,
        },
        {
          id: 529,
          label: 'Lesson 4',
          title: 'Spot where automations help',
          completed: false,
          icon: Satellite,
          active: false,
        },
      ],
    },
  ]

  return (
    <>
      <div className="relative mx-auto min-h-dvh w-full max-w-2xl py-2">
        <div className="px-4">
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="mb-2">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-sidebar-accent text-sidebar-accent-foreground rounded-full px-3 py-1 text-xs font-medium">
                    Personal plan
                  </span>
                </div>

                {/* Fire / Streak button */}
                <button
                  type="button"
                  onClick={() => setStreakOpen(true)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1',
                    'text-sm font-semibold text-orange-700',
                    'bg-linear-to-r from-orange-100 to-amber-100',
                    'ring-1 ring-orange-200/80 shadow-sm',
                    'transition-all duration-200',
                    'hover:shadow-md hover:ring-orange-300/80 hover:scale-105',
                    'active:scale-95'
                  )}
                  aria-label="View streak progress"
                >
                  <span className="tabular-nums">1</span>
                  <Flame className="size-4 fill-orange-500 text-orange-500" />
                </button>
              </div>
              <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                AI Bots and Automation
                <ChevronRight className="text-muted-foreground size-6" />
              </h1>
            </div>

            {/* Progress Card - Animated progress indicator */}
            <ProgressCard progress={26} />

            {/* Courses Section - Horizontal Scroll */}
            <div>
              <h2 className="mb-3 text-lg font-semibold">Courses</h2>
              <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-4">
                {mockCourses.map((course) => (
                  <Link
                    key={course.id}
                    to={`/academy/courses/${course.id}`}
                    className="bg-card hover:border-primary/50 relative flex min-w-[200px] flex-col justify-between rounded-xl border p-4 shadow-sm transition-all"
                  >
                    <div className="mb-4">
                      <h3 className="line-clamp-2 font-medium leading-tight">
                        {course.title}
                      </h3>
                    </div>
                    <div className="flex items-end justify-between">
                      {course.progress > 0 ? (
                        <span className="text-muted-foreground text-xs">
                          {course.progress}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          Start
                        </span>
                      )}
                      <div className="bg-primary/10 flex size-8 items-center justify-center rounded-full">
                        <Play className="text-primary size-4 fill-current" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Modules Section */}
            {mockModules.map((module) => (
              <div key={module.id} className="pb-20">
                <div className="mb-5">
                  <h2 className="text-lg font-semibold">{module.title}</h2>
                  <p className="text-muted-foreground text-sm">
                    {module.lessonCount} lessons
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  {module.lessons.map((lesson) => {
                    const Icon = lesson.icon
                    return (
                      <Link
                        key={lesson.id}
                        to={`/academy/courses/33/lessons/${lesson.id}`}
                        className={cn(
                          'flex items-center justify-between rounded-2xl p-4 transition-all duration-200',
                          lesson.active
                            ? 'bg-primary/5 border-2 border-primary/30 animate-[pulse-border_2.5s_ease-in-out_infinite] motion-reduce:animate-none'
                            : 'bg-muted/50 border border-transparent hover:bg-muted/80'
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={cn(
                              'flex size-12 shrink-0 items-center justify-center rounded-2xl',
                              lesson.active
                                ? 'bg-primary text-primary-foreground'
                                : lesson.completed
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-muted text-muted-foreground'
                            )}
                          >
                            <Icon className="size-5" />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium text-muted-foreground">
                              {lesson.label}
                            </span>
                            <span
                              className={cn(
                                'text-sm font-semibold',
                                lesson.active || lesson.completed
                                  ? 'text-foreground'
                                  : 'text-muted-foreground'
                              )}
                            >
                              {lesson.title}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {lesson.completed ? (
                            <div className="flex size-7 items-center justify-center rounded-full border-2 border-green-500 text-green-500">
                              <Check className="size-4 stroke-[2.5]" />
                            </div>
                          ) : !lesson.active ? (
                            <Lock className="text-muted-foreground/25 size-5" />
                          ) : null}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Streak Sheet */}
      <StreakSheet open={streakOpen} onOpenChange={setStreakOpen} />
    </>
  )
}
