import { useParams, useNavigate } from 'react-router-dom'
import { LessonViewer, getLessonContent } from '@/widgets/lesson-viewer'
import { lessonApi } from '@/widgets/lesson-viewer/api'
import { streakApi } from '@features/streak/api'
import { mockSkills } from '@features/skills'

export default function SkillLessonPage() {
  const { skillId, lessonId } = useParams<{
    skillId: string
    lessonId: string
  }>()
  const navigate = useNavigate()

  const numericLessonId = Number(lessonId)
  const content = getLessonContent(numericLessonId)
  const skill = mockSkills.find((s) => s.id === Number(skillId))
  const lesson = skill?.modules
    .flatMap((m) => m.lessons)
    .find((l) => l.id === numericLessonId)

  async function handleFinish() {
    try {
      await lessonApi.complete(numericLessonId)
      await streakApi.checkIn()
    } catch {
      // API not available — continue silently
    }
    navigate(`/skills/${skillId}`)
  }

  return (
    <LessonViewer
      content={content}
      lessonLabel={lesson?.label ?? 'Lesson'}
      onClose={() => navigate(`/skills/${skillId}`)}
      onFinish={handleFinish}
    />
  )
}
