import { supabaseAdmin } from '../db/supabase.js'
import { quizLog } from '../lib/logger.js'

/**
 * Serves quiz content from the database.
 *
 * The whole active version is returned in one request rather than a node at a
 * time: the quiz is ~33 short screens (a few KB total), and per-step fetching
 * would put a network round trip between every tap — on the mobile connections
 * this funnel runs on, that is a visible stall at each question and a new
 * failure point where a dropped request strands the visitor mid-quiz.
 *
 * Cached in memory because the content changes on an editor's schedule, not a
 * visitor's: without it every landing hit would re-query the same rows.
 */

export interface QuizStepContent {
  step_id: string
  step_order: number
  step_type: string
  section: string
  question_text: string | null
  subtitle: string | null
  answer_key: string | null
  options: { value: string; label: string; icon?: string; emoji?: string }[]
  input_type: string
  content: Record<string, unknown>
  next_step_id: string | null
  progress_title: string | null
  progress_value: number | null
}

export interface QuizContent {
  version: string
  landing: string
  steps: QuizStepContent[]
}

/** How long a fetched version is reused before re-reading the DB. */
const CACHE_TTL_MS = 60_000

const cache = new Map<string, { at: number; value: QuizContent | null }>()

/**
 * Returns the active quiz for a landing, or null when none is published.
 *
 * Null is a normal answer, not an error: it means the client should fall back to
 * its built-in flow. Never throws — a content-service failure must not be able
 * to take the funnel down, so a broken read degrades to the hardcoded quiz.
 */
export async function getActiveQuiz(landing = 'usa'): Promise<QuizContent | null> {
  const hit = cache.get(landing)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value

  try {
    const { data: version, error: vErr } = await supabaseAdmin
      .from('quiz_versions')
      .select('id, version, landing')
      .eq('landing', landing)
      .eq('is_active', true)
      .maybeSingle()

    if (vErr) throw new Error(vErr.message)
    if (!version) {
      cache.set(landing, { at: Date.now(), value: null })
      return null
    }

    const { data: steps, error: sErr } = await supabaseAdmin
      .from('quiz_steps')
      .select(
        'step_id, step_order, step_type, section, question_text, subtitle, answer_key, options, input_type, content, next_step_id, progress_title, progress_value'
      )
      .eq('version_id', version.id)
      .order('step_order', { ascending: true })

    if (sErr) throw new Error(sErr.message)

    // A version with no steps would render an empty quiz — worse than falling
    // back to the built-in flow, so treat it as "nothing published".
    if (!steps?.length) {
      quizLog.warn('quiz_content.active_version_has_no_steps', {
        version: version.version,
      })
      cache.set(landing, { at: Date.now(), value: null })
      return null
    }

    const value: QuizContent = {
      version: version.version,
      landing: version.landing,
      steps: steps as unknown as QuizStepContent[],
    }
    cache.set(landing, { at: Date.now(), value })
    return value
  } catch (err) {
    quizLog.error('quiz_content.fetch_failed', {
      landing,
      message: err instanceof Error ? err.message : 'unknown',
    })
    // Cache the failure briefly too, so a DB outage doesn't turn into a retry
    // storm from every visitor on the page.
    cache.set(landing, { at: Date.now(), value: null })
    return null
  }
}

/** Drops the cache so an editor's change is visible without waiting out the TTL. */
export function invalidateQuizCache(landing?: string): void {
  if (landing) cache.delete(landing)
  else cache.clear()
}
