import { supabaseAdmin } from '../db/supabase.js'
import { quizLog } from '../lib/logger.js'

/**
 * Per-step quiz analytics ingestion.
 *
 * Writes an append-only row per screen viewed/answered, keyed by `anon_id` so a
 * visitor who abandons at question 10 is recorded just as fully as one who
 * finishes. See migration 037 for why this is a log rather than a profile row.
 *
 * Every function here is best-effort and never throws: analytics must not be
 * able to break the funnel it is measuring. A failed write is logged and
 * swallowed — a lost data point is acceptable, a blocked quiz is not.
 */

export type QuizEventName =
  | 'quiz_start'
  | 'step_view'
  | 'step_answer'
  | 'quiz_complete'
  | 'quiz_abandon'

export interface QuizEventInput {
  /** Client-generated idempotency key; a retry reuses it and is discarded. */
  event_id: string
  anon_id: string
  session_id?: string
  email?: string
  event_name: QuizEventName
  step_order?: number
  step_id?: string
  section?: string
  step_type?: string
  question_text?: string
  answer_label?: string
  answer_value?: unknown
  ms_on_step?: number
  ms_in_quiz?: number
  quiz_version?: string
  landing_version?: string
  attribution?: Record<string, unknown>
  props?: Record<string, unknown>
  landing?: string
  device?: string
  /** Funnel routing dimensions (migration 042). Present once the flex quiz ships;
   *  older clients omit them and the columns stay null. */
  product_slug?: string
  funnel_slug?: string
  flow_version?: string
  ab_bucket?: string
  /** Named funnel stage; only on the events that reach one. */
  checkpoint?: string
}

/** Postgres unique_violation — a duplicate event, not a failure. */
const UNIQUE_VIOLATION = '23505'

/**
 * Records a batch of quiz events.
 *
 * Batched because the client buffers: sending one request per screen would mean
 * ~33 round trips per visitor, and any of them failing mid-flight (tab closed,
 * flaky mobile connection) would silently lose that step.
 *
 * Returns the number of rows written; callers use it only for logging.
 */
export async function recordQuizEvents(events: QuizEventInput[]): Promise<number> {
  if (!events.length) return 0

  // De-duplicate within the batch before hitting the DB: a client retry can
  // resend a buffer that overlaps the previous one, and `upsert` would still
  // reject the whole statement if the same key appeared twice in one payload.
  const seen = new Set<string>()
  const unique = events.filter((e) => {
    if (!e.event_id || seen.has(e.event_id)) return false
    seen.add(e.event_id)
    return true
  })
  if (!unique.length) return 0

  const rows = unique.map((e) => ({
    event_id: e.event_id,
    anon_id: e.anon_id,
    session_id: e.session_id ?? null,
    email: e.email ? e.email.trim().toLowerCase() : null,
    event_name: e.event_name,
    step_order: e.step_order ?? null,
    step_id: e.step_id ?? null,
    section: e.section ?? null,
    step_type: e.step_type ?? null,
    question_text: e.question_text ?? null,
    answer_label: e.answer_label ?? null,
    // jsonb column: a bare string/number is valid JSON, so multi-select arrays
    // and single values both round-trip without a separate column.
    answer_value: e.answer_value === undefined ? null : e.answer_value,
    ms_on_step: e.ms_on_step ?? null,
    ms_in_quiz: e.ms_in_quiz ?? null,
    quiz_version: e.quiz_version ?? null,
    landing_version: e.landing_version ?? null,
    attribution: e.attribution ?? {},
    props: e.props ?? {},
    landing: e.landing ?? 'usa',
    device: e.device ?? null,
    // Funnel dimensions. Null-tolerant: pre-flex clients don't send them, and the
    // columns are nullable, so old and new payloads both write cleanly.
    product_slug: e.product_slug ?? null,
    funnel_slug: e.funnel_slug ?? null,
    flow_version: e.flow_version ?? null,
    ab_bucket: e.ab_bucket ?? null,
    checkpoint: e.checkpoint ?? null,
  }))

  // upsert + ignoreDuplicates, not insert: a plain insert is one statement, so a
  // single already-seen event_id would abort the whole batch and drop the other
  // 49 valid rows. This keeps the new ones and silently skips the repeats.
  const { error, count } = await supabaseAdmin
    .from('quiz_events')
    .upsert(rows, { onConflict: 'event_id', ignoreDuplicates: true, count: 'exact' })

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      quizLog.info('quiz_events.duplicate', { count: rows.length })
      return 0
    }
    quizLog.error('quiz_events.insert_failed', {
      message: error.message,
      count: rows.length,
    })
    return 0
  }

  return count ?? rows.length
}

/**
 * Attaches an email to every earlier event from the same device.
 *
 * Until the email screen the visitor is only an `anon_id`, so their first 30
 * answers carry no address. Backfilling here is what lets a purchase be joined
 * back to the answers that preceded it — the whole point of collecting them.
 *
 * Scoped to rows that don't already have an email so a second, different email
 * from the same device can't rewrite the first visitor's history.
 */
export async function attachEmailToQuizEvents(
  anonId: string,
  email: string
): Promise<void> {
  if (!anonId || !email) return

  const { error } = await supabaseAdmin
    .from('quiz_events')
    .update({ email: email.trim().toLowerCase() })
    .eq('anon_id', anonId)
    .is('email', null)

  if (error) {
    quizLog.error('quiz_events.email_backfill_failed', {
      anonId,
      message: error.message,
    })
  }
}

/**
 * Links a user id onto a person's events once they have an account.
 *
 * Matched by email rather than anon_id: someone can start on their phone and
 * pay on a laptop, and the email is the only identifier shared across both.
 */
export async function attachUserToQuizEvents(
  email: string,
  userId: string
): Promise<void> {
  if (!email || !userId) return

  const { error } = await supabaseAdmin
    .from('quiz_events')
    .update({ user_id: userId })
    .eq('email', email.trim().toLowerCase())
    .is('user_id', null)

  if (error) {
    quizLog.error('quiz_events.user_link_failed', { email, message: error.message })
  }
}
