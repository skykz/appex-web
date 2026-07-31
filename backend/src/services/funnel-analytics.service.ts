import { supabaseAdmin } from '../db/supabase.js'
import { quizLog } from '../lib/logger.js'

/**
 * Funnel analytics for the admin dashboard.
 *
 * Aggregates `quiz_events` into the two questions the funnel actually needs
 * answered: where visitors stop, and which answers correlate with paying.
 *
 * Everything is computed per SESSION rather than per anon_id — anon_id lives in
 * localStorage across visits, so counting devices would merge two separate
 * attempts into one and understate both traffic and drop-off.
 */

export interface FunnelStep {
  step_order: number
  step_id: string
  section: string | null
  question_text: string | null
  reached: number
  answered: number
  median_seconds: number | null
  /** Sessions that reached this step but never appeared on a later one. */
  dropped: number
  /** dropped / reached, as a percentage. */
  drop_rate: number
  /** reached / (first step's reached), as a percentage. */
  conversion_from_start: number
}

export interface FunnelSummary {
  steps: FunnelStep[]
  totals: {
    sessions: number
    reached_email: number
    completed: number
    devices: number
  }
  range: { from: string; to: string }
}

interface EventRow {
  session_id: string | null
  anon_id: string
  step_id: string | null
  step_order: number | null
  section: string | null
  event_name: string
  ms_on_step: number | null
  question_text: string | null
}

/** Median of a numeric list; null when empty. Used instead of the mean because
 *  one abandoned tab left open for an hour destroys an average. */
function median(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * Builds the drop-off funnel for a date range.
 *
 * Computed in application code rather than SQL so the admin can slice by
 * attribution without a migration per filter; the row counts here are small
 * (one row per screen per visitor) and bounded by the range.
 */
export async function getFunnel(opts: {
  from?: string
  to?: string
  landing?: string
  utm_source?: string
  quiz_version?: string
} = {}): Promise<FunnelSummary> {
  // The default upper bound sits slightly in the future on purpose. `created_at`
  // is stamped by Postgres, and any clock skew between this process and the DB
  // (or a row written while the report is being built) would otherwise fall
  // outside `now()` and silently drop the most recent events — the ones an
  // admin checking "did my change work?" is looking for.
  const to = opts.to ?? new Date(Date.now() + 5 * 60_000).toISOString()
  const from =
    opts.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  let query = supabaseAdmin
    .from('quiz_events')
    .select('session_id, anon_id, step_id, step_order, section, event_name, ms_on_step, question_text')
    .gte('created_at', from)
    .lte('created_at', to)
    .not('step_id', 'is', null)
    // Bounded so a wide range can't try to page the whole table into memory.
    .limit(100_000)

  if (opts.landing) query = query.eq('landing', opts.landing)
  if (opts.quiz_version) query = query.eq('quiz_version', opts.quiz_version)
  if (opts.utm_source) query = query.eq('attribution->>utm_source', opts.utm_source)

  const { data, error } = await query
  if (error) {
    quizLog.error('funnel.query_failed', { message: error.message })
    return { steps: [], totals: { sessions: 0, reached_email: 0, completed: 0, devices: 0 }, range: { from, to } }
  }

  const rows = (data ?? []) as EventRow[]
  /** Session key; falls back to the device when a session id is missing. */
  const keyOf = (r: EventRow) => r.session_id || r.anon_id

  // step_id → aggregation buckets
  const steps = new Map<
    string,
    {
      order: number
      section: string | null
      question: string | null
      reached: Set<string>
      answered: Set<string>
      times: number[]
    }
  >()
  const allSessions = new Set<string>()
  const devices = new Set<string>()
  /** Highest step_order each session got to — the basis for "dropped here". */
  const furthest = new Map<string, number>()

  for (const r of rows) {
    if (!r.step_id) continue
    const key = keyOf(r)
    allSessions.add(key)
    devices.add(r.anon_id)

    const order = r.step_order ?? 0
    const prev = furthest.get(key) ?? -1
    if (order > prev) furthest.set(key, order)

    let bucket = steps.get(r.step_id)
    if (!bucket) {
      bucket = {
        order,
        section: r.section,
        question: r.question_text,
        reached: new Set(),
        answered: new Set(),
        times: [],
      }
      steps.set(r.step_id, bucket)
    }
    // Keep the earliest order seen; a later mis-ordered row shouldn't move a
    // step in the funnel.
    if (order && order < bucket.order) bucket.order = order
    if (!bucket.question && r.question_text) bucket.question = r.question_text
    bucket.reached.add(key)
    if (r.event_name === 'step_answer') bucket.answered.add(key)
    if (typeof r.ms_on_step === 'number' && r.ms_on_step > 0) bucket.times.push(r.ms_on_step)
  }

  const ordered = [...steps.entries()].sort((a, b) => a[1].order - b[1].order)
  const startReached = ordered[0]?.[1].reached.size ?? 0

  const result: FunnelStep[] = ordered.map(([step_id, b]) => {
    // Dropped = sessions whose furthest step is exactly this one. Derived from
    // the max step per session rather than "reached here minus reached next",
    // which breaks the moment anyone navigates backwards.
    let dropped = 0
    for (const s of b.reached) if ((furthest.get(s) ?? -1) <= b.order) dropped++

    const reached = b.reached.size
    return {
      step_order: b.order,
      step_id,
      section: b.section,
      question_text: b.question,
      reached,
      answered: b.answered.size,
      median_seconds: b.times.length ? Math.round((median(b.times) ?? 0) / 100) / 10 : null,
      dropped,
      drop_rate: reached ? Math.round((dropped / reached) * 1000) / 10 : 0,
      conversion_from_start: startReached
        ? Math.round((reached / startReached) * 1000) / 10
        : 0,
    }
  })

  const emailStep = result.find((s) => s.step_id === 'email_capture')
  const completed = result.find((s) => s.step_id === 'plan_reveal')

  return {
    steps: result,
    totals: {
      sessions: allSessions.size,
      reached_email: emailStep?.reached ?? 0,
      completed: completed?.reached ?? 0,
      devices: devices.size,
    },
    range: { from, to },
  }
}

export interface AnswerBreakdown {
  step_id: string
  question_text: string | null
  options: { answer: string; count: number; share: number }[]
}

/**
 * Answer distribution for one question — "what did people actually pick".
 *
 * Uses the LATEST answer per session, so someone who changes their mind is
 * counted once, under their final choice.
 */
export async function getAnswerBreakdown(
  stepId: string,
  opts: { from?: string; to?: string } = {}
): Promise<AnswerBreakdown> {
  // The default upper bound sits slightly in the future on purpose. `created_at`
  // is stamped by Postgres, and any clock skew between this process and the DB
  // (or a row written while the report is being built) would otherwise fall
  // outside `now()` and silently drop the most recent events — the ones an
  // admin checking "did my change work?" is looking for.
  const to = opts.to ?? new Date(Date.now() + 5 * 60_000).toISOString()
  const from =
    opts.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabaseAdmin
    .from('quiz_events')
    .select('session_id, anon_id, answer_label, answer_value, question_text, created_at')
    .eq('step_id', stepId)
    .eq('event_name', 'step_answer')
    .gte('created_at', from)
    .lte('created_at', to)
    .order('created_at', { ascending: true })
    .limit(50_000)

  if (error) {
    quizLog.error('funnel.breakdown_failed', { stepId, message: error.message })
    return { step_id: stepId, question_text: null, options: [] }
  }

  // Last write per session wins.
  const latest = new Map<string, string>()
  let question: string | null = null
  for (const r of data ?? []) {
    const key = (r.session_id as string) || (r.anon_id as string)
    const label =
      (r.answer_label as string) ??
      (typeof r.answer_value === 'string' ? r.answer_value : JSON.stringify(r.answer_value))
    if (label) latest.set(key, label)
    if (!question && r.question_text) question = r.question_text as string
  }

  const counts = new Map<string, number>()
  for (const v of latest.values()) counts.set(v, (counts.get(v) ?? 0) + 1)
  const total = latest.size

  return {
    step_id: stepId,
    question_text: question,
    options: [...counts.entries()]
      .map(([answer, count]) => ({
        answer,
        count,
        share: total ? Math.round((count / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count),
  }
}
