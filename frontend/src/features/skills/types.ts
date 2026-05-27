/**
 * Domain types for skills (courses) shown on the learner platform.
 * Data is loaded from `GET /api/skills`; these types mirror the API shape.
 */

export interface SkillLesson {
  id: number
  label: string
  title: string
  emoji: string
  locked: boolean
  /**
   * Why the lesson is locked:
   *   - 'sequence' — previous lesson not finished (linear progression)
   *   - 'premium'  — this skill requires an active subscription
   *   - null       — not locked
   * The UI uses this to choose between a plain padlock and a Premium badge.
   */
  locked_reason?: 'premium' | 'sequence' | null
  /** Present on skill detail responses; reflects `lesson_progress.completed`. */
  completed?: boolean
}

export interface SkillModule {
  id: number
  title: string
  lessonCount: number
  lessons: SkillLesson[]
}

export type SkillStatus = 'not_started' | 'in_progress' | 'completed'

/** Category slug from the database (admin-managed). */
export type SkillCategorySlug = string

/** Tab filter: `all` or a category slug such as `ai_automations`. */
export type SkillCategoryFilter = 'all' | SkillCategorySlug

export interface SkillListItem {
  id: number
  title: string
  description: string
  about: string
  emoji: string
  category: SkillCategorySlug
  duration: string
  order: number
  created_at?: string
  progress: number
  status: SkillStatus
  /** True when the skill is a paid skill (everything except the first one). */
  requires_premium?: boolean
  /** True when `requires_premium` AND the user is not on an active subscription. */
  premium_locked?: boolean
}

export interface SkillDetail extends SkillListItem {
  modules: SkillModule[]
}

/** Card grid item — same as list row from API (no modules on list endpoint). */
export type SkillCardModel = SkillListItem

export const skillCategories: { value: SkillCategoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'ai_automations', label: 'AI automations' },
  { value: 'freelancing', label: 'Freelancing' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'ai_content', label: 'AI content' },
]
