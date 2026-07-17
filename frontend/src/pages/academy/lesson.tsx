import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  LessonViewer,
  buildLessonContentFromApi,
  lessonApi,
  resolveModuleCompletion,
} from '@/widgets/lesson-viewer'
import { streakApi } from '@features/streak/api'
import { skillsApi, type SkillDetail } from '@features/skills'
import { PageLoader } from '@shared/ui'

/**
 * Finds the next lesson in course order after the current lesson.
 */
function getNextLessonId(skill: SkillDetail | undefined, currentLessonId: number) {
  const lessons = skill?.modules.flatMap((module) => module.lessons) ?? []
  const currentIndex = lessons.findIndex((lesson) => lesson.id === currentLessonId)
  if (currentIndex < 0) return null
  return lessons[currentIndex + 1]?.id ?? null
}

/**
 * Academy route lesson player — same lesson API as skills, with academy navigation paths.
 */
export default function LessonPage() {
  const { courseId, lessonId } = useParams<{
    courseId: string
    lessonId: string
  }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const numericLessonId = Number(lessonId)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['lesson', numericLessonId],
    queryFn: () => lessonApi.get(numericLessonId),
    enabled: Number.isFinite(numericLessonId),
  })
  const numericCourseId = Number(courseId)

  const { data: course } = useQuery({
    queryKey: ['skill', numericCourseId],
    queryFn: () => skillsApi.getDetail(numericCourseId),
    enabled: Number.isFinite(numericCourseId),
  })

  const content = data
    ? buildLessonContentFromApi(data.id, data.steps)
    : null

  async function persistStep(stepIndex: number) {
    if (!Number.isFinite(numericLessonId)) return
    try {
      await lessonApi.updateProgress(numericLessonId, stepIndex)
    } catch {
      /* ignore */
    }
  }

  async function onAfterFeedbackCommit(feedback?: { rating?: number; feedback?: string }) {
    if (!Number.isFinite(numericLessonId)) {
      return { showDayStreak: false }
    }
    await lessonApi.complete(numericLessonId, feedback)
    const streak = await streakApi.checkIn()
    void queryClient.invalidateQueries({ queryKey: ['streak'] })
    return { showDayStreak: streak.firstCheckInToday === true }
  }

  function handleFinish() {
    const nextLessonId = getNextLessonId(course, numericLessonId)
    navigate(
      nextLessonId
        ? `/academy/courses/${courseId}/lessons/${nextLessonId}`
        : `/academy/courses/${courseId}`
    )
    void queryClient.invalidateQueries({ queryKey: ['skills'] })
    void queryClient.invalidateQueries({
      queryKey: ['skill', Number(courseId)],
    })
    void queryClient.invalidateQueries({ queryKey: ['lesson', numericLessonId] })
    void queryClient.invalidateQueries({ queryKey: ['streak'] })
  }

  if (!Number.isFinite(numericLessonId) || !courseId) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-muted-foreground text-sm">Invalid lesson link</p>
      </div>
    )
  }

  if (isPending || !content) {
    return <PageLoader label="Loading lesson…" />
  }

  if (isError) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-muted-foreground text-sm">
          This lesson could not be loaded.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          Retry
        </button>
        <button
          type="button"
          onClick={() => navigate(`/academy/courses/${courseId}`)}
          className="text-primary text-sm font-medium"
        >
          Back to course
        </button>
      </div>
    )
  }

  if (!content.steps.length) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-muted-foreground text-sm">
          This lesson has no content yet.
        </p>
        <button
          type="button"
          onClick={() => navigate(`/academy/courses/${courseId}`)}
          className="text-primary text-sm font-medium"
        >
          Back to course
        </button>
      </div>
    )
  }

  const moduleCompletion = resolveModuleCompletion(course, numericLessonId)

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <LessonViewer
        content={content}
        quizAttempts={data.quizAttempts ?? []}
        lessonLabel={data.label}
        moduleCompletion={moduleCompletion}
        initialStepIndex={data.progress.stepIndex}
        lessonCompleted={data.progress.completed}
        onStepChange={persistStep}
        onClose={() => navigate(`/academy/courses/${courseId}`)}
        onFinish={handleFinish}
        onAfterFeedbackCommit={onAfterFeedbackCommit}
      />
    </div>
  )
}
