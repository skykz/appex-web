import { useParams, useNavigate } from 'react-router-dom'
import { LessonViewer, getLessonContent } from '@/widgets/lesson-viewer'
import { lessonApi } from '@/widgets/lesson-viewer/api'
import { streakApi } from '@features/streak/api'

export default function LessonPage() {
  const { courseId, lessonId } = useParams<{
    courseId: string
    lessonId: string
  }>()
  const navigate = useNavigate()

  const numericLessonId = Number(lessonId)
  const content = getLessonContent(numericLessonId)

  async function handleFinish() {
    try {
      await lessonApi.complete(numericLessonId)
      await streakApi.checkIn()
    } catch {
      // API not available — continue silently
    }
    navigate(`/academy/courses/${courseId}`)
  }

  return (
    <LessonViewer
      content={content}
      lessonLabel={`Lesson ${lessonId}`}
      onClose={() => navigate(`/academy/courses/${courseId}`)}
      onFinish={handleFinish}
    />
  )
}
