import type { SkillDetail } from '@features/skills/types'

export interface ModuleCompletionContext {
  /** Human label such as "Module 1". */
  moduleLabel: string
  /** CMS module title shown in admin. */
  moduleTitle: string
}

/**
 * Returns module completion context when the lesson is the last one in its module.
 */
export function resolveModuleCompletion(
  skill: SkillDetail | undefined,
  lessonId: number
): ModuleCompletionContext | null {
  if (!skill) return null

  for (let moduleIndex = 0; moduleIndex < skill.modules.length; moduleIndex++) {
    const mod = skill.modules[moduleIndex]
    const lessons = mod.lessons
    if (lessons.length === 0) continue

    const lastLesson = lessons[lessons.length - 1]
    if (lastLesson.id !== lessonId) continue

    return {
      moduleLabel: `Module ${moduleIndex + 1}`,
      moduleTitle: mod.title,
    }
  }

  return null
}
