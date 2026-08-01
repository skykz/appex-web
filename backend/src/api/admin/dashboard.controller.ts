import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'
import {
  excludeAdminUsers,
  getAdminUserIds,
} from '../../utils/admin-insights.js'

const statsQuerySchema = z.object({
  /** Window applied to time-bounded metrics. `all` leaves them unbounded. */
  range: z.enum(['all', '7d', '30d', '90d']).default('all'),
})

const RANGE_DAYS: Record<string, number | null> = {
  all: null,
  '7d': 7,
  '30d': 30,
  '90d': 90,
}

/** ISO timestamp `days` ago, or null for an unbounded range. */
function sinceIso(days: number | null): string | null {
  if (days == null) return null
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

/**
 * Slug of the email-capture screen, from `quiz-steps.ts` on the landing
 * (step 43 / overlay step 31). Kept as a constant because it is the one step id
 * this summary hard-codes — if the quiz is restructured and this slug changes,
 * the "reached email" figure silently drops to zero.
 */
const EMAIL_STEP_ID = 'email_capture'

type CountableQuery = ReturnType<
  ReturnType<typeof supabaseAdmin.from>['select']
>

async function count(
  table: string,
  filter?: (q: CountableQuery) => CountableQuery
): Promise<number> {
  const base = supabaseAdmin.from(table).select('*', { count: 'exact', head: true })
  const q = filter ? filter(base) : base
  const { count: n, error } = await q
  if (error) throw new AppError(500, `${table} count: ${error.message}`)
  return n ?? 0
}

function startOfTodayUTC(): string {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString()
}

/**
 * Counts funnel leads (no account) split by whether they clicked the emailed
 * confirmation link.
 *
 * Returns nulls instead of throwing when `confirmed_at` is absent: the column
 * arrives with migration 041, and a dashboard that 500s on every card because one
 * optional metric is unavailable would be worse than hiding that one metric. The
 * UI renders a dash for null.
 */
async function getLeadConfirmationTotals(): Promise<{
  confirmed: number | null
  unconfirmed: number | null
}> {
  try {
    const [confirmed, unconfirmed] = await Promise.all([
      supabaseAdmin
        .from('landing_quiz_submissions')
        .select('*', { count: 'exact', head: true })
        .is('user_id', null)
        .not('confirmed_at', 'is', null),
      supabaseAdmin
        .from('landing_quiz_submissions')
        .select('*', { count: 'exact', head: true })
        .is('user_id', null)
        .is('confirmed_at', null),
    ])

    if (confirmed.error || unconfirmed.error) return { confirmed: null, unconfirmed: null }
    return { confirmed: confirmed.count ?? 0, unconfirmed: unconfirmed.count ?? 0 }
  } catch {
    return { confirmed: null, unconfirmed: null }
  }
}

/**
 * Landing-quiz funnel: how many attempts started, how many reached the end, and
 * how many stopped somewhere in between.
 *
 * Counted per SESSION rather than per `anon_id`, matching `quiz_funnel` in
 * migration 037: `anon_id` lives in localStorage across visits, so someone who
 * starts on Monday and restarts on Tuesday is one device but two attempts —
 * counting devices would merge those and understate both traffic and drop-off.
 *
 * `quiz_events` is written from the first landing hit, so unlike
 * `landing_quiz_submissions` (only written at the email step) this does see the
 * visitors who leave early.
 */
async function getQuizFunnel(since: string | null): Promise<{
  started: number
  completed: number
  abandoned: number
  completionRate: number
  reachedEmail: number
}> {
  let query = supabaseAdmin
    .from('quiz_events')
    .select('anon_id, session_id, event_name, step_id')
    .in('event_name', ['quiz_start', 'quiz_complete', 'step_answer'])
  if (since) query = query.gte('created_at', since)

  const { data, error } = await query
  if (error) {
    // The table arrives with migration 037; treat "not applied yet" as "no data"
    // rather than failing the whole dashboard.
    //
    // Matched on error CODE, not on the message: `42703` ("column ... does not
    // exist") also contains "does not exist", so a text match would swallow a
    // genuine typo in a column name and report zeroes instead of surfacing it.
    //   42P01    — undefined_table, what PostgREST returns directly (verified)
    //   PGRST205 — Supabase/PostgREST cannot find the table in its schema cache
    if (error.code === '42P01' || error.code === 'PGRST205') {
      return { started: 0, completed: 0, abandoned: 0, completionRate: 0, reachedEmail: 0 }
    }
    throw new AppError(500, `quiz_events: ${error.message}`)
  }

  const started = new Set<string>()
  const completed = new Set<string>()
  const reachedEmail = new Set<string>()

  for (const row of data ?? []) {
    const attempt = String(row.session_id ?? row.anon_id ?? '')
    if (!attempt) continue
    const name = row.event_name as string
    if (name === 'quiz_start') started.add(attempt)
    else if (name === 'quiz_complete') completed.add(attempt)
    if (row.step_id === EMAIL_STEP_ID) reachedEmail.add(attempt)
  }

  // A session that only emitted later events still started the quiz; union so a
  // dropped `quiz_start` beacon can't make "completed" exceed "started".
  for (const a of completed) started.add(a)
  for (const a of reachedEmail) started.add(a)

  const startedCount = started.size
  const completedCount = completed.size

  return {
    started: startedCount,
    completed: completedCount,
    abandoned: Math.max(0, startedCount - completedCount),
    completionRate: startedCount
      ? Math.round((completedCount / startedCount) * 1000) / 10
      : 0,
    reachedEmail: reachedEmail.size,
  }
}

/**
 * Sums billing revenue, excluding payments from admin accounts.
 */
async function sumRevenueExcludingAdmins(
  adminIds: string[],
  since: string | null
): Promise<number> {
  let query = supabaseAdmin.from('billing_history').select('amount')
  if (since) query = query.gte('paid_at', since)
  query = excludeAdminUsers(query, adminIds)
  const { data, error } = await query
  if (error) throw new AppError(500, `billing_history sum: ${error.message}`)
  return (data ?? []).reduce((acc, row) => acc + Number(row.amount ?? 0), 0)
}

/**
 * Aggregates live counts + recent activity for the admin dashboard in one call.
 * Admin accounts are excluded from user-facing metrics so internal activity does not skew insights.
 */
export async function getDashboardStats(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { range } = statsQuerySchema.parse(req.query)
    const since = sinceIso(RANGE_DAYS[range] ?? null)
    const today = startOfTodayUTC()
    const adminIds = await getAdminUserIds()

    const [
      usersTotal,
      skillsTotal,
      lessonsCompletedTotal,
      activeSubs,
      revenue,
      quiz,
      leadConfirmation,
    ] = await Promise.all([
      // Signups are datable, so the range narrows them to "new users in period".
      count('users', (q) => {
        const base = q.neq('role', 'admin')
        return since ? base.gte('created_at', since) : base
      }),
      // Catalog size and active-subscription count are point-in-time state, not
      // events, so a date range does not apply to them.
      count('skills'),
      count('lesson_progress', (q) => {
        const base = excludeAdminUsers(q.eq('completed', true), adminIds)
        return since ? base.gte('completed_at', since) : base
      }),
      count('subscriptions', (q) =>
        excludeAdminUsers(q.eq('status', 'active'), adminIds)
      ),
      sumRevenueExcludingAdmins(adminIds, since),
      getQuizFunnel(since),
      // Point-in-time state, so the date range does not apply.
      getLeadConfirmationTotals(),
    ])

    // Users active today = streak_days rows for today, excluding admins
    let activeTodayQuery = supabaseAdmin
      .from('streak_days')
      .select('*', { count: 'exact', head: true })
      .eq('date', today.slice(0, 10))
    activeTodayQuery = excludeAdminUsers(activeTodayQuery, adminIds)
    const { count: activeTodayCount, error: activeErr } = await activeTodayQuery
    if (activeErr) throw new AppError(500, activeErr.message)

    // Recent non-admin signups
    const { data: recentUsers } = await supabaseAdmin
      .from('users')
      .select('id, email, name, created_at')
      .neq('role', 'admin')
      .order('created_at', { ascending: false })
      .limit(5)

    // Recent lesson completions from non-admin users
    let recentCompletionsQuery = supabaseAdmin
      .from('lesson_progress')
      .select('completed_at, lesson_id, user_id, users!inner(email, role), lessons(title)')
      .eq('completed', true)
      .not('completed_at', 'is', null)
      .neq('users.role', 'admin')
      .order('completed_at', { ascending: false })
      .limit(5)
    recentCompletionsQuery = excludeAdminUsers(recentCompletionsQuery, adminIds)
    const { data: recentCompletions, error: recentErr } = await recentCompletionsQuery
    if (recentErr) throw new AppError(500, recentErr.message)

    const recentLessonsCompleted = (recentCompletions ?? []).map((r: Record<string, unknown>) => ({
      user_id: String(r.user_id ?? ''),
      user_email: (r.users as { email?: string } | null)?.email ?? '—',
      lesson_title: (r.lessons as { title?: string } | null)?.title ?? '(deleted lesson)',
      completed_at: r.completed_at as string,
    }))

    res.json({
      range,
      totals: {
        users: usersTotal,
        activeToday: activeTodayCount ?? 0,
        skills: skillsTotal,
        lessonsCompleted: lessonsCompletedTotal,
        activeSubscriptions: activeSubs,
        revenue,
        /** Leads who clicked the emailed confirm link. null = column not migrated yet. */
        confirmedLeads: leadConfirmation.confirmed,
        unconfirmedLeads: leadConfirmation.unconfirmed,
      },
      quiz,
      recentUsers: recentUsers ?? [],
      recentLessonsCompleted,
    })
  } catch (err) {
    next(err)
  }
}
