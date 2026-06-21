import { supabaseAdmin } from '../db/supabase.js'

/**
 * Logs every lesson open and sets opened_at on lesson_progress the first time.
 */
export async function recordLessonOpen(
  userId: string,
  lessonId: number
): Promise<void> {
  const now = new Date().toISOString()

  const { error: eventError } = await supabaseAdmin.from('lesson_open_events').insert({
    user_id: userId,
    lesson_id: lessonId,
    opened_at: now,
  })

  if (eventError) {
    console.error('[lesson-open] event insert failed', userId, lessonId, eventError.message)
  }

  const { data: existing } = await supabaseAdmin
    .from('lesson_progress')
    .select('id, opened_at')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (existing?.opened_at) return

  if (existing) {
    const { error: progressError } = await supabaseAdmin
      .from('lesson_progress')
      .update({ opened_at: now })
      .eq('id', existing.id)

    if (progressError) {
      console.error('[lesson-open] progress update failed', userId, lessonId, progressError.message)
    }
    return
  }

  const { error: progressError } = await supabaseAdmin.from('lesson_progress').insert({
    user_id: userId,
    lesson_id: lessonId,
    step_index: 0,
    opened_at: now,
  })

  if (progressError) {
    console.error('[lesson-open] progress insert failed', userId, lessonId, progressError.message)
  }
}

/**
 * Counts distinct lessons opened on or after a reference timestamp.
 *
 * Throws on query failure rather than returning 0. These counts gate refund
 * eligibility: a silent 0 on a transient DB error would read as "no engagement"
 * and wrongly APPROVE a refund for a user who actually opened lessons. Failing
 * closed (propagating the error) makes the refund evaluation abort instead.
 */
export async function countLessonsOpenedSince(
  userId: string,
  sinceIso: string
): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('lesson_open_events')
    .select('lesson_id')
    .eq('user_id', userId)
    .gte('opened_at', sinceIso)

  if (error) {
    console.error('[lesson-open] count opened failed', userId, error.message)
    throw new Error(`Failed to count opened lessons: ${error.message}`)
  }

  return new Set((data ?? []).map((r) => r.lesson_id as number)).size
}

/**
 * Counts lessons completed on or after a reference timestamp.
 * Throws on failure (fail-closed) for the same refund-eligibility reason as above.
 */
export async function countLessonsCompletedSince(
  userId: string,
  sinceIso: string
): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('lesson_progress')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('completed_at', sinceIso)

  if (error) {
    console.error('[lesson-open] count completed failed', userId, error.message)
    throw new Error(`Failed to count completed lessons: ${error.message}`)
  }

  return count ?? 0
}
