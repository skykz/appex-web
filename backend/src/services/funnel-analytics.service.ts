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
  /**
   * reached / the baseline for this step's stage, as a percentage.
   *
   * Null when no baseline exists in the range, rather than a number derived from
   * whatever row happened to sort first — see `stage`.
   */
  conversion_from_start: number | null
  /**
   * Which population the percentage is measured against: `quiz` steps are a
   * share of quiz starts, `post_quiz` ones (paywall and later) a share of
   * paywall views.
   *
   * They are genuinely different populations, not two ends of one sequence: the
   * paywall is its own route, reachable by direct link, by reload, and by
   * Stripe returning a buyer — often in a new tab, which starts a new session.
   * So it legitimately holds sessions the quiz steps never saw, and putting both
   * on one scale makes the later stage look like it out-converted the earlier.
   */
  stage: 'quiz' | 'post_quiz'
  /**
   * question | info | loader | milestone | funnel.
   *
   * Surfaced because the diagnosis differs by kind: people leaving a `question`
   * suggests the wording or the ask is wrong, while leaving an `info` screen
   * means they lost patience reading. Ranking both in one list invites the wrong
   * fix.
   */
  step_type: string | null
  /**
   * Sessions that saw the screen but never answered it.
   *
   * Distinct from `dropped`: someone can view a question, skip past it and still
   * finish the quiz. A screen with reached=50 / answered=10 looks healthy on drop
   * rate alone while quietly being ignored by 40 people.
   * Always 0 for screens that take no answer.
   */
  viewed_not_answered: number
}

/** Where a whole stage of the funnel loses people, not just one screen. */
export interface SectionRollup {
  section: string
  entered: number
  exited: number
  drop_rate: number
}

/** Same funnel split by device — drop-off usually differs sharply by screen size. */
export interface DeviceSplit {
  device: string
  sessions: number
  reached_email: number
  completed: number
  completion_rate: number
}

export interface FunnelSummary {
  steps: FunnelStep[]
  totals: {
    sessions: number
    reached_email: number
    completed: number
    devices: number
    /** Sessions that left before answering a single question. */
    bounced_immediately: number
  }
  /** Aggregated by funnel stage, so a bad SECTION is visible when no single
   *  screen looks unusual on its own. */
  sections: SectionRollup[]
  by_device: DeviceSplit[]
  range: { from: string; to: string }
}

interface EventRow {
  session_id: string | null
  anon_id: string
  /** Present from the email step onward; used to spot our own test addresses. */
  email: string | null
  device: string | null
  step_id: string | null
  step_order: number | null
  section: string | null
  step_type: string | null
  event_name: string
  ms_on_step: number | null
  question_text: string | null
}

/**
 * Session/device prefixes and email domains produced by our own testing.
 *
 * Excluded from every report: a handful of synthetic sessions is a large share of
 * a funnel this size, so leaving them in would move the drop-off numbers the
 * whole page exists to show. Filtered at query time rather than by deleting rows,
 * so a test run stays inspectable without polluting the metrics.
 */
const TEST_ID_PREFIXES = ['demo-', 'aud-', 'audit-', 'probe-', 'test-']
const TEST_EMAIL_PATTERNS = ['@example.', '@test.', '@df.com', 'probe+', 'audit+']

/** True when the row came from our own testing rather than a real visitor. */
export function isTestRow(r: { session_id: string | null; anon_id: string; email?: string | null }): boolean {
  const ids = [r.session_id ?? '', r.anon_id ?? '']
  if (ids.some((id) => TEST_ID_PREFIXES.some((p) => id.startsWith(p)))) return true
  const email = (r.email ?? '').toLowerCase()
  return Boolean(email) && TEST_EMAIL_PATTERNS.some((p) => email.includes(p))
}

/**
 * Rows PostgREST returns in one response before it stops, regardless of
 * `.limit()`.
 *
 * The server enforces its own `max-rows` ceiling (1000 by default on Supabase),
 * and a client-side `.limit(100_000)` does NOT raise it — the request simply
 * comes back capped, with no error and no indication anything was dropped. A
 * report built on that slice looks complete and is silently partial: measured
 * on this project's own data, a window holding 2222 rows / 445 sessions
 * reported 206 sessions, a 54% undercount.
 */
const PAGE_SIZE = 1000

/**
 * Reads every row a query matches, a page at a time.
 *
 * Takes a builder rather than a finished query because each page needs a fresh
 * `.range()`, and a PostgREST query object cannot be re-ranged once awaited.
 *
 * `hardCap` bounds total memory for a very wide range; hitting it is logged
 * rather than passed over, since a truncated report is exactly the failure this
 * function exists to prevent — better a visible warning than a quiet wrong
 * number.
 */
export async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  label: string,
  hardCap = 200_000
): Promise<{ rows: T[]; truncated: boolean }> {
  const rows: T[] = []
  for (let page = 0; page * PAGE_SIZE < hardCap; page++) {
    const start = page * PAGE_SIZE
    const { data, error } = await build(start, start + PAGE_SIZE - 1)
    if (error) {
      quizLog.error(`${label}.page_failed`, { page, message: error.message })
      // Returns what was gathered rather than nothing: a partial report flagged
      // as partial beats an empty one that reads as "no traffic".
      return { rows, truncated: true }
    }
    const batch = data ?? []
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) return { rows, truncated: false }
  }
  quizLog.error(`${label}.hard_cap_hit`, { cap: hardCap, rows: rows.length })
  return { rows, truncated: true }
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
  /**
   * Scopes the whole funnel to one paywall pricing arm.
   *
   * Without it the two arms are merged into a single funnel, which looks
   * entirely plausible and is wrong — the same mistake fixed for `quiz_funnel`
   * in migration 043.
   */
  pricing_variant?: string
} = {}): Promise<FunnelSummary> {
  // The default upper bound sits slightly in the future on purpose. `created_at`
  // is stamped by Postgres, and any clock skew between this process and the DB
  // (or a row written while the report is being built) would otherwise fall
  // outside `now()` and silently drop the most recent events — the ones an
  // admin checking "did my change work?" is looking for.
  const to = opts.to ?? new Date(Date.now() + 5 * 60_000).toISOString()
  const from =
    opts.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Paged: a single request is silently capped at PAGE_SIZE by the server, so
  // `.limit()` alone would hand back a partial funnel that looks whole.
  const { rows: fetched, truncated } = await fetchAllRows<EventRow>((start, end) => {
    let query = supabaseAdmin
      .from('quiz_events')
      .select('session_id, anon_id, email, device, step_id, step_order, section, step_type, event_name, ms_on_step, question_text')
      .gte('created_at', from)
      .lte('created_at', to)
      .not('step_id', 'is', null)
      // Stable order is REQUIRED for paging to be coherent: without it
      // PostgREST may return rows in a different order per page, so a row can
      // be seen twice or missed entirely across page boundaries.
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(start, end)

    if (opts.landing) query = query.eq('landing', opts.landing)
    if (opts.quiz_version) query = query.eq('quiz_version', opts.quiz_version)
    if (opts.pricing_variant) query = query.eq('pricing_variant', opts.pricing_variant)
    if (opts.utm_source) query = query.eq('attribution->>utm_source', opts.utm_source)
    return query
  }, 'funnel')

  if (truncated) quizLog.error('funnel.partial_result', { from, to })

  // A failed first page returns no rows; report the empty funnel rather than
  // pretending the range genuinely held no traffic.
  if (truncated && fetched.length === 0) {
    return {
      steps: [],
      totals: { sessions: 0, reached_email: 0, completed: 0, devices: 0, bounced_immediately: 0 },
      sections: [],
      by_device: [],
      range: { from, to },
    }
  }

  // Drop our own test traffic before any counting — see isTestRow.
  const rows = fetched.filter((r) => !isTestRow(r))
  /** Session key; falls back to the device when a session id is missing. */
  const keyOf = (r: EventRow) => r.session_id || r.anon_id

  // step_id → aggregation buckets
  const steps = new Map<
    string,
    {
      order: number
      section: string | null
      stepType: string | null
      question: string | null
      reached: Set<string>
      answered: Set<string>
      times: number[]
    }
  >()
  const allSessions = new Set<string>()
  const devices = new Set<string>()
  /** session → device, for the per-device split. */
  const sessionDevice = new Map<string, string>()
  /** Sessions that answered at least one question — the rest simply bounced. */
  const answeredAny = new Set<string>()
  /** section → sessions that entered it, for the stage rollup. */
  const sectionSessions = new Map<string, Set<string>>()
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
        stepType: r.step_type,
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
    if (!bucket.stepType && r.step_type) bucket.stepType = r.step_type
    bucket.reached.add(key)
    if (r.device && !sessionDevice.has(key)) sessionDevice.set(key, r.device)
    if (r.section) {
      let sec = sectionSessions.get(r.section)
      if (!sec) { sec = new Set(); sectionSessions.set(r.section, sec) }
      sec.add(key)
    }
    if (r.event_name === 'step_answer') {
      bucket.answered.add(key)
      answeredAny.add(key)
    }
    if (typeof r.ms_on_step === 'number' && r.ms_on_step > 0) bucket.times.push(r.ms_on_step)
  }

  // Ties broken by step_id so the order is stable: several step_ids share a
  // step_order (the quiz's last screen, the wheel and quiz_complete all sit at
  // 34), and without a tiebreak their relative position came out of Map
  // insertion order — i.e. it changed with the data.
  const ordered = [...steps.entries()].sort(
    (a, b) => a[1].order - b[1].order || a[0].localeCompare(b[0])
  )

  /**
   * First post-quiz `step_order`. FUNNEL_ORDER on the client starts the
   * paywall-side events at 90 (wheel) / 100 (paywall), well clear of the ~34
   * quiz screens.
   */
  const POST_QUIZ_FROM = 90
  const stageOf = (order: number): 'quiz' | 'post_quiz' =>
    order >= POST_QUIZ_FROM ? 'post_quiz' : 'quiz'

  /**
   * Baseline per stage, resolved from a NAMED step rather than whatever sorted
   * first.
   *
   * `ordered[0]` was the bug: it is only the funnel's start if the earliest
   * screens happen to be present in the window. Once they age out of the range —
   * or a filter excludes them — the baseline silently became some later step, so
   * every percentage was a share of an arbitrary row. That is how `paywall_view`
   * came to report 100% while the steps above it showed less: it had become the
   * denominator.
   *
   * Falls back through a couple of near-equivalent anchors so an unusual range
   * still reports something sound, and yields undefined when none are present —
   * callers then show no percentage instead of a made-up one.
   */
  const reachedOf = (stepId: string) =>
    steps.get(stepId)?.reached.size ?? undefined
  const firstDefined = (...vals: (number | undefined)[]) =>
    vals.find((v) => typeof v === 'number' && v > 0)

  const quizBaseline = firstDefined(
    reachedOf('quiz_start'),
    // The quiz's own first screen, whatever it is called in this flow version.
    ordered.find(([, b]) => stageOf(b.order) === 'quiz')?.[1].reached.size
  )
  const postQuizBaseline = firstDefined(
    reachedOf('paywall_view'),
    ordered.find(([, b]) => stageOf(b.order) === 'post_quiz')?.[1].reached.size
  )

  const result: FunnelStep[] = ordered.map(([step_id, b]) => {
    // Dropped = sessions whose furthest step is exactly this one. Derived from
    // the max step per session rather than "reached here minus reached next",
    // which breaks the moment anyone navigates backwards.
    let dropped = 0
    for (const s of b.reached) if ((furthest.get(s) ?? -1) <= b.order) dropped++

    const reached = b.reached.size
    const stage = stageOf(b.order)
    const baseline = stage === 'post_quiz' ? postQuizBaseline : quizBaseline
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
      conversion_from_start: baseline
        ? Math.round((reached / baseline) * 1000) / 10
        : null,
      stage,
      step_type: b.stepType,
      // Only meaningful where an answer is expected; info/loader screens would
      // otherwise all report their full audience as "ignored".
      viewed_not_answered:
        b.stepType === 'question' ? Math.max(0, reached - b.answered.size) : 0,
    }
  })

  const emailStep = result.find((s) => s.step_id === 'email_capture')
  const completed = result.find((s) => s.step_id === 'plan_reveal')

  // Section rollup: `exited` counts sessions whose furthest step belongs to this
  // section, so a stage that bleeds people across several unremarkable screens
  // still shows up.
  const stepSection = new Map(result.map((r) => [r.step_order, r.section]))
  const sections: SectionRollup[] = [...sectionSessions.entries()]
    .map(([section, members]) => {
      let exited = 0
      for (const sess of members) {
        const far = furthest.get(sess) ?? -1
        if (stepSection.get(far) === section) exited++
      }
      return {
        section,
        entered: members.size,
        exited,
        drop_rate: members.size ? Math.round((exited / members.size) * 1000) / 10 : 0,
      }
    })
    // Ordered by where the section sits in the flow, not alphabetically.
    .sort((a, b) => {
      const first = (sec: string) =>
        result.find((r) => r.section === sec)?.step_order ?? 999
      return first(a.section) - first(b.section)
    })

  // Per-device split. Completion is measured against the same final step used in
  // `totals`, so the numbers reconcile.
  const emailSessions = new Set<string>()
  const doneSessions = new Set<string>()
  for (const [id, b] of steps) {
    if (id === 'email_capture') for (const k of b.reached) emailSessions.add(k)
    if (id === 'plan_reveal') for (const k of b.reached) doneSessions.add(k)
  }
  const deviceBuckets = new Map<string, { sessions: Set<string>; email: number; done: number }>()
  for (const sess of allSessions) {
    const dev = sessionDevice.get(sess) ?? 'unknown'
    let bucket = deviceBuckets.get(dev)
    if (!bucket) { bucket = { sessions: new Set(), email: 0, done: 0 }; deviceBuckets.set(dev, bucket) }
    bucket.sessions.add(sess)
    if (emailSessions.has(sess)) bucket.email++
    if (doneSessions.has(sess)) bucket.done++
  }
  const by_device: DeviceSplit[] = [...deviceBuckets.entries()]
    .map(([device, b]) => ({
      device,
      sessions: b.sessions.size,
      reached_email: b.email,
      completed: b.done,
      completion_rate: b.sessions.size ? Math.round((b.done / b.sessions.size) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions)

  return {
    steps: result,
    totals: {
      sessions: allSessions.size,
      reached_email: emailStep?.reached ?? 0,
      completed: completed?.reached ?? 0,
      devices: devices.size,
      bounced_immediately: allSessions.size - answeredAny.size,
    },
    sections,
    by_device,
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
    .select('session_id, anon_id, email, answer_label, answer_value, question_text, created_at')
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
    if (isTestRow(r as { session_id: string | null; anon_id: string; email?: string | null })) continue
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
