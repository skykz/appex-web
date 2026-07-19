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
 * Full-screen skill lesson player: loads CMS content and syncs step progress to the API.
 */
export default function SkillLessonPage() {
  const { skillId, lessonId } = useParams<{
    skillId: string
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
  const numericSkillId = Number(skillId)

  const { data: skill } = useQuery({
    queryKey: ['skill', numericSkillId],
    queryFn: () => skillsApi.getDetail(numericSkillId),
    enabled: Number.isFinite(numericSkillId),
  })

  const content = data
    ? buildLessonContentFromApi(data.id, data.steps)
    : null

  /**
   * Persists the current step index so the learner can resume later.
   */
  async function persistStep(stepIndex: number) {
    if (!Number.isFinite(numericLessonId)) return
    try {
      await lessonApi.updateProgress(numericLessonId, stepIndex)
    } catch {
      /* network — local navigation still works */
    }
  }

  /**
   * Marks lesson complete and checks streak; streak UI only on first check-in of the UTC day.
   */
  async function onAfterFeedbackCommit(feedback?: { rating?: number; feedback?: string }) {
    if (!Number.isFinite(numericLessonId)) {
      return { showDayStreak: false }
    }
    try {
      await lessonApi.complete(numericLessonId, feedback)
      const streak = await streakApi.checkIn()
      void queryClient.invalidateQueries({ queryKey: ['streak'] })
      return { showDayStreak: streak.firstCheckInToday === true }
    } catch (err) {
      // Surface to the viewer so the learner isn't stuck on a silent failure.
      console.error('Failed to commit lesson completion / streak check-in', err)
      throw err
    }
  }

  /**
   * Leaves the lesson flow: navigate first, then refresh caches in the background (avoids long waits / connection resets).
   */
  function handleFinish() {
    const nextLessonId = getNextLessonId(skill, numericLessonId)
    navigate(nextLessonId ? `/skills/${skillId}/lessons/${nextLessonId}` : `/skills/${skillId}`)
    void queryClient.invalidateQueries({ queryKey: ['skills'] })
    void queryClient.invalidateQueries({ queryKey: ['skill', Number(skillId)] })
    void queryClient.invalidateQueries({ queryKey: ['lesson', numericLessonId] })
    void queryClient.invalidateQueries({ queryKey: ['streak'] })
  }

  if (!Number.isFinite(numericLessonId) || !skillId) {
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
          onClick={() => navigate(`/skills/${skillId}`)}
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
          onClick={() => navigate(`/skills/${skillId}`)}
          className="text-primary text-sm font-medium"
        >
          Back to course
        </button>
      </div>
    )
  }

  const moduleCompletion = resolveModuleCompletion(skill, numericLessonId)

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
        onClose={() => navigate(`/skills/${skillId}`)}
        onFinish={handleFinish}
        onAfterFeedbackCommit={onAfterFeedbackCommit}
      />
    </div>
  )
}
