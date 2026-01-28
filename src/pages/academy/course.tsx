import { useParams, Link } from 'react-router-dom'

/**
 * Academy course page - displays course overview and list of modules/lessons.
 * Route: /academy/courses/:courseId
 */
export default function CoursePage() {
  const { courseId } = useParams<{ courseId: string }>()

  // TODO: Replace with real data fetching
  const mockCourse = {
    id: courseId,
    title: 'Start Automation Journey',
    description: 'Learn the fundamentals of automation',
    modules: [
      {
        id: 1,
        title: 'Module 1: Understand the Game',
        lessonCount: 7,
        lessons: [
          { id: 526, title: 'Lesson 1: Why you are here' },
          { id: 527, title: 'Lesson 2: Meet n8n' },
          { id: 528, title: 'Lesson 3: Learn how automations work' },
          { id: 529, title: 'Lesson 4: Spot where automations help' },
          { id: 530, title: 'Lesson 5: How automation drives growth' },
          { id: 531, title: 'Lesson 6: Who builds automations' },
          { id: 532, title: 'Lesson 7: Your automation toolkit' },
        ],
      },
    ],
  }

  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-2xl py-2">
      <div className="px-4">
        <div className="mb-6">
          <Link
            to="/home"
            className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center text-sm transition-colors"
          >
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">
            {mockCourse.title}
          </h1>
          <p className="text-muted-foreground mt-2">
            {mockCourse.description}
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {mockCourse.modules.map((module) => (
            <div key={module.id}>
              <div className="mb-4">
                <h2 className="text-xl font-semibold">{module.title}</h2>
                <p className="text-muted-foreground text-sm">
                  {module.lessonCount} lessons
                </p>
              </div>

              <div className="flex flex-col gap-4">
                {module.lessons.map((lesson) => (
                  <Link
                    key={lesson.id}
                    to={`/academy/courses/${courseId}/lessons/${lesson.id}`}
                    className="bg-muted hover:bg-muted/80 flex items-center gap-3 rounded-2xl p-3 transition-all"
                  >
                    {lesson.title}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
