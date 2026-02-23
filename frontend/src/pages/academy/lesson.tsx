import { useParams, Link } from 'react-router-dom'

/**
 * Academy lesson page - displays individual lesson content.
 * Route: /academy/courses/:courseId/lessons/:lessonId
 */
export default function LessonPage() {
  const { courseId, lessonId } = useParams<{
    courseId: string
    lessonId: string
  }>()

  // TODO: Replace with real data fetching
  const mockLesson = {
    id: lessonId,
    title: 'Meet n8n',
    content:
      'n8n is a powerful workflow automation tool that helps you connect different services and automate repetitive tasks.',
    courseId,
  }

  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-2xl py-2">
      <div className="px-4">
        <div className="mb-6">
          <Link
            to={`/academy/courses/${courseId}`}
            className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center text-sm transition-colors"
          >
            ← Back to Course
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">
            {mockLesson.title}
          </h1>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <p>{mockLesson.content}</p>
          {/* TODO: Add rich lesson content (video, text, exercises, etc.) */}
        </div>

        <div className="mt-8 flex justify-between">
          <button className="text-muted-foreground hover:text-foreground text-sm transition-colors">
            ← Previous Lesson
          </button>
          <button className="text-muted-foreground hover:text-foreground text-sm transition-colors">
            Next Lesson →
          </button>
        </div>
      </div>
    </div>
  )
}
