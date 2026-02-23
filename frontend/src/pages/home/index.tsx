import { Link } from 'react-router-dom'
import {
  Play,
  Map,
  Settings,
  Satellite,
  Check,
  Lock,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@shared/lib'
import { ProgressCard } from '@shared/ui'

/**
 * Home page - personal plan dashboard with courses and progress.
 * Shows 4-week plan overview, progress tracking, and course modules.
 */
export default function HomePage() {
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
          title: 'Lesson 1: Why you are here',
          completed: true,
          icon: Map,
          active: false,
        },
        {
          id: 527,
          title: 'Lesson 2: Meet n8n',
          completed: false,
          icon: Settings,
          active: true,
        },
        {
          id: 528,
          title: 'Lesson 3: Learn how automations work',
          completed: false,
          icon: Satellite,
          active: false,
        },
        {
          id: 529,
          title: 'Lesson 4: Spot where automations help',
          completed: false,
          icon: Satellite,
          active: false,
        },
      ],
    },
  ]

  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-2xl py-2">
      <div className="px-4">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="mb-2">
            <div className="mb-1 flex items-center gap-2">
              <span className="bg-sidebar-accent text-sidebar-accent-foreground rounded-full px-3 py-1 text-xs font-medium">
                Personal plan
              </span>
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                1 <span>🔥</span>
              </span>
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
              <div className="mb-4">
                <h2 className="text-lg font-semibold">{module.title}</h2>
                <p className="text-muted-foreground text-sm">
                  {module.lessonCount} lessons
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {module.lessons.map((lesson) => {
                  const Icon = lesson.icon
                  return (
                    <Link
                      key={lesson.id}
                      to={`/academy/courses/33/lessons/${lesson.id}`}
                      className={cn(
                        'flex items-center justify-between rounded-2xl border p-4 transition-all',
                        lesson.active
                          ? 'border-primary/20 bg-primary/5'
                          : 'bg-card hover:bg-muted/50 border-transparent'
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            'flex size-10 items-center justify-center rounded-xl',
                            lesson.active
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          <Icon className="size-5" />
                        </div>
                        <span
                          className={cn(
                            'text-sm font-medium',
                            lesson.active ? 'text-foreground' : 'text-muted-foreground'
                          )}
                        >
                          {lesson.title}
                        </span>
                      </div>
                      <div>
                        {lesson.completed ? (
                          <div className="flex size-6 items-center justify-center rounded-full bg-green-500 text-white">
                            <Check className="size-3.5 stroke-3" />
                          </div>
                        ) : (
                          <Lock className="text-muted-foreground/30 size-5" />
                        )}
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
  )
}
