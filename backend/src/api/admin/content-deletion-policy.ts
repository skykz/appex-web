import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'

/**
 * ## Admin content deletion policy (single source of truth)
 *
 * **Audience:** support and engineering — read this before changing delete behavior or advising customers.
 *
 * **Problem:** PostgreSQL uses `ON DELETE CASCADE` from catalog tables (`skills`, `modules`, `lessons`)
 * into learner tables (`skill_progress`, `lesson_progress`, `lesson_submissions`, `lesson_quiz_attempts`).
 * A naive admin `DELETE` would silently wipe learner history.
 *
 * **Rule:** Admin API hard-deletes a course (skill), module, or lesson **only** when no *blocking*
 * learner-attributed data exists for that scope. If any blocker exists, respond with **409 Conflict**
 * and a short explanation so operators know why.
 *
 * **What counts as blocking**
 *
 * 1. **Course (`skills`):** Any `skill_progress` row for this course with `progress > 0` OR
 *    `status != 'not_started'`. OR any blocking lesson-level data for **any** lesson in the course
 *    (see below).
 * 2. **Module (`modules`):** Any blocking lesson-level data for **any** lesson in that module.
 * 3. **Lesson (`lessons`):** Any of:
 *    - `lesson_progress` with meaningful activity: `completed`, `step_index > 0`,
 *      `completed_at` set, or `rating` set.
 *    - Any row in `lesson_submissions` for that lesson.
 *    - Any row in `lesson_quiz_attempts` for that lesson.
 *
 * **Soft-delete / archive (alternative, not implemented here):** Product may later add e.g.
 * `lessons.archived_at` and hide archived lessons from the learner app while keeping audit rows.
 * That path preserves submissions and attempts without CASCADE deletes; this module documents the
 * **hard-delete** gate only.
 */

const HTTP_CONFLICT = 409

/**
 * Returns all lesson primary keys under a course (skill).
 */
async function fetchLessonIdsForSkill(skillId: number): Promise<number[]> {
  const { data: modules, error: mErr } = await supabaseAdmin
    .from('modules')
    .select('id')
    .eq('skill_id', skillId)
  if (mErr) throw new AppError(500, mErr.message)
  const moduleIds = (modules ?? []).map((m) => m.id)
  if (moduleIds.length === 0) return []
  const { data: lessons, error: lErr } = await supabaseAdmin
    .from('lessons')
    .select('id')
    .in('module_id', moduleIds)
  if (lErr) throw new AppError(500, lErr.message)
  return (lessons ?? []).map((l) => l.id)
}

/**
 * Returns all lesson primary keys for a single module.
 */
async function fetchLessonIdsForModule(moduleId: number): Promise<number[]> {
  const { data, error } = await supabaseAdmin
    .from('lessons')
    .select('id')
    .eq('module_id', moduleId)
  if (error) throw new AppError(500, error.message)
  return (data ?? []).map((l) => l.id)
}

/**
 * Detects course-level progress rows that would be destroyed by deleting the skill.
 */
async function hasBlockingSkillProgress(skillId: number): Promise<boolean> {
  const { data: byPct, error: e1 } = await supabaseAdmin
    .from('skill_progress')
    .select('id')
    .eq('skill_id', skillId)
    .gt('progress', 0)
    .limit(1)
  if (e1) throw new AppError(500, e1.message)
  if ((byPct?.length ?? 0) > 0) return true

  const { data: byStatus, error: e2 } = await supabaseAdmin
    .from('skill_progress')
    .select('id')
    .eq('skill_id', skillId)
    .neq('status', 'not_started')
    .limit(1)
  if (e2) throw new AppError(500, e2.message)
  return (byStatus?.length ?? 0) > 0
}

/**
 * Detects lesson_progress rows that indicate real learner activity (not an empty default row).
 */
async function hasBlockingLessonProgress(lessonIds: number[]): Promise<boolean> {
  if (lessonIds.length === 0) return false
  const base = () =>
    supabaseAdmin.from('lesson_progress').select('id').in('lesson_id', lessonIds).limit(1)

  const checks = await Promise.all([
    base().eq('completed', true),
    base().gt('step_index', 0),
    base().not('completed_at', 'is', null),
    base().not('rating', 'is', null),
  ])
  for (const { data, error } of checks) {
    if (error) throw new AppError(500, error.message)
    if ((data?.length ?? 0) > 0) return true
  }
  return false
}

/**
 * Detects student submissions tied to any of the given lessons.
 */
async function hasLessonSubmissions(lessonIds: number[]): Promise<boolean> {
  if (lessonIds.length === 0) return false
  const { data, error } = await supabaseAdmin
    .from('lesson_submissions')
    .select('id')
    .in('lesson_id', lessonIds)
    .limit(1)
  if (error) throw new AppError(500, error.message)
  return (data?.length ?? 0) > 0
}

/**
 * Detects stored quiz attempts tied to any of the given lessons.
 */
async function hasQuizAttempts(lessonIds: number[]): Promise<boolean> {
  if (lessonIds.length === 0) return false
  const { data, error } = await supabaseAdmin
    .from('lesson_quiz_attempts')
    .select('id')
    .in('lesson_id', lessonIds)
    .limit(1)
  if (error) throw new AppError(500, error.message)
  return (data?.length ?? 0) > 0
}

/**
 * Collects human-readable block reasons for the given lesson id set; optionally includes skill-level progress.
 */
async function collectBlockReasons(
  lessonIds: number[],
  options?: { skillId?: number }
): Promise<string[]> {
  const reasons: string[] = []

  if (options?.skillId != null) {
    const blocks = await hasBlockingSkillProgress(options.skillId)
    if (blocks) {
      reasons.push('learners have course-level progress on this course')
    }
  }

  const [lp, sub, att] = await Promise.all([
    hasBlockingLessonProgress(lessonIds),
    hasLessonSubmissions(lessonIds),
    hasQuizAttempts(lessonIds),
  ])
  if (lp) reasons.push('lesson progress or completion exists for at least one lesson in scope')
  if (sub) reasons.push('lesson submissions exist')
  if (att) reasons.push('quiz attempts exist')

  return reasons
}

/**
 * Throws 409 if the lesson cannot be hard-deleted without destroying learner data.
 */
export async function assertCanDeleteLesson(lessonId: number): Promise<void> {
  const reasons = await collectBlockReasons([lessonId])
  if (reasons.length === 0) return
  throw new AppError(
    HTTP_CONFLICT,
    `Cannot delete lesson: ${reasons.join('; ')}. Remove or archive content instead, or contact engineering.`
  )
}

/**
 * Throws 409 if the module (and its lessons) cannot be hard-deleted without destroying learner data.
 */
export async function assertCanDeleteModule(moduleId: number): Promise<void> {
  const lessonIds = await fetchLessonIdsForModule(moduleId)
  const reasons = await collectBlockReasons(lessonIds)
  if (reasons.length === 0) return
  throw new AppError(
    HTTP_CONFLICT,
    `Cannot delete module: ${reasons.join('; ')}. Remove learner activity first or use a future archive flow.`
  )
}

/**
 * Throws 409 if the course cannot be hard-deleted without destroying learner data.
 */
export async function assertCanDeleteCourse(skillId: number): Promise<void> {
  const lessonIds = await fetchLessonIdsForSkill(skillId)
  const reasons = await collectBlockReasons(lessonIds, { skillId })
  if (reasons.length === 0) return
  throw new AppError(
    HTTP_CONFLICT,
    `Cannot delete course: ${reasons.join('; ')}. Remove learner activity first or use a future archive flow.`
  )
}
