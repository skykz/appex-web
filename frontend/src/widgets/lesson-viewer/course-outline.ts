import type { SkillDetail } from '@features/skills/types'

/** One row in the in-lesson course map (module + lesson metadata). */
export type CourseMapLessonRow = {
  lessonId: number
  moduleTitle: string
  label: string
  title: string
  emoji: string
  locked: boolean
  /** Distinguishes a paywall lock from an "earn the previous lesson first" lock. */
  locked_reason?: 'premium' | 'sequence' | null
  completed?: boolean
}

/** Flat outline + navigation builder for the lesson viewer course map. */
export type CourseMapOutline = {
  courseTitle: string
  lessons: CourseMapLessonRow[]
  hrefForLesson: (lessonId: number) => string
  currentLessonId: number
}

/**
 * Flattens skill detail modules into a single ordered list for the course map UI.
 */
export function buildCourseMapOutline(
  skill: SkillDetail,
  currentLessonId: number,
  hrefForLesson: (lessonId: number) => string
): CourseMapOutline {
  const lessons: CourseMapLessonRow[] = []
  for (const mod of skill.modules) {
    for (const l of mod.lessons) {
      lessons.push({
        lessonId: l.id,
        moduleTitle: mod.title,
        label: l.label,
        title: l.title,
        emoji: l.emoji,
        locked: l.locked,
        locked_reason: l.locked_reason ?? null,
        completed: l.completed,
      })
    }
  }
  return {
    courseTitle: skill.title,
    lessons,
    hrefForLesson,
    currentLessonId,
  }
}
