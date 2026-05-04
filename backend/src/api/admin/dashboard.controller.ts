import type { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'

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

function daysAgoUTC(days: number): string {
  const d = new Date()
  const base = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  return new Date(base - days * 86400000).toISOString()
}

/**
 * Aggregates live counts + recent activity for the admin dashboard in one call.
 * Uses exact counts for accuracy over speed; volumes are small.
 */
export async function getDashboardStats(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const today = startOfTodayUTC()
    const fourteenDaysAgo = daysAgoUTC(13)

    const [
      usersTotal,
      skillsTotal,
      modulesTotal,
      lessonsTotal,
      chatSessionsTotal,
      chatMessagesTotal,
      lessonsCompletedTotal,
      activeSubs,
      contactsTotal,
    ] = await Promise.all([
      count('users'),
      count('skills'),
      count('modules'),
      count('lessons'),
      count('chat_sessions'),
      count('chat_messages'),
      count('lesson_progress', (q) => q.eq('completed', true)),
      count('subscriptions', (q) => q.eq('status', 'active')),
      count('contact_messages'),
    ])

    // Users active today = distinct streak_days rows for today
    const { count: activeTodayCount, error: activeErr } = await supabaseAdmin
      .from('streak_days')
      .select('*', { count: 'exact', head: true })
      .eq('date', today.slice(0, 10))
    if (activeErr) throw new AppError(500, activeErr.message)

    // Credits pool = sum of user_credits.balance
    const { data: creditsRows, error: creditsErr } = await supabaseAdmin
      .from('user_credits')
      .select('balance')
    if (creditsErr) throw new AppError(500, creditsErr.message)
    const creditsRemaining = (creditsRows ?? []).reduce(
      (acc, r) => acc + (r.balance ?? 0),
      0
    )

    // Total revenue = sum of billing_history.amount
    const { data: billingRows, error: billingErr } = await supabaseAdmin
      .from('billing_history')
      .select('amount')
    if (billingErr) throw new AppError(500, billingErr.message)
    const revenue = (billingRows ?? []).reduce(
      (acc, r) => acc + Number(r.amount ?? 0),
      0
    )

    // Recent users
    const { data: recentUsers } = await supabaseAdmin
      .from('users')
      .select('id, email, name, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    // Recent lesson completions (joined with user + lesson for display)
    const { data: recentCompletions, error: recentErr } = await supabaseAdmin
      .from('lesson_progress')
      .select('completed_at, lesson_id, user_id, users(email), lessons(title)')
      .eq('completed', true)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(5)
    if (recentErr) throw new AppError(500, recentErr.message)

    const recentLessonsCompleted = (recentCompletions ?? []).map((r: Record<string, unknown>) => ({
      user_id: String(r.user_id ?? ''),
      user_email: (r.users as { email?: string } | null)?.email ?? '—',
      lesson_title: (r.lessons as { title?: string } | null)?.title ?? '(deleted lesson)',
      completed_at: r.completed_at as string,
    }))

    // Signups per day over the last 14 days
    const { data: signupRows, error: signupErr } = await supabaseAdmin
      .from('users')
      .select('created_at')
      .gte('created_at', fourteenDaysAgo)
    if (signupErr) throw new AppError(500, signupErr.message)

    const buckets = new Map<string, number>()
    for (let i = 13; i >= 0; i--) {
      buckets.set(daysAgoUTC(i).slice(0, 10), 0)
    }
    for (const row of signupRows ?? []) {
      const day = String(row.created_at).slice(0, 10)
      if (buckets.has(day)) buckets.set(day, (buckets.get(day) ?? 0) + 1)
    }
    const signupsByDay = [...buckets.entries()].map(([date, count]) => ({
      date,
      count,
    }))

    res.json({
      totals: {
        users: usersTotal,
        activeToday: activeTodayCount ?? 0,
        skills: skillsTotal,
        modules: modulesTotal,
        lessons: lessonsTotal,
        chatSessions: chatSessionsTotal,
        chatMessages: chatMessagesTotal,
        lessonsCompleted: lessonsCompletedTotal,
        activeSubscriptions: activeSubs,
        revenue,
        creditsRemaining,
        contactMessages: contactsTotal,
      },
      recentUsers: recentUsers ?? [],
      recentLessonsCompleted,
      signupsByDay,
    })
  } catch (err) {
    next(err)
  }
}
