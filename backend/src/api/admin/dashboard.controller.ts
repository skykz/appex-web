import type { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'
import {
  adminExclusionInList,
  excludeAdminUsers,
  getAdminUserIds,
} from '../../utils/admin-insights.js'

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
 * Counts chat messages excluding sessions owned by admin accounts.
 */
async function countChatMessagesExcludingAdmins(adminIds: string[]): Promise<number> {
  const adminList = adminExclusionInList(adminIds)
  if (!adminList) return count('chat_messages')

  const { data: adminSessions, error: sessionErr } = await supabaseAdmin
    .from('chat_sessions')
    .select('id')
    .in('user_id', adminIds)
  if (sessionErr) throw new AppError(500, `chat_sessions admin filter: ${sessionErr.message}`)

  const sessionIds = (adminSessions ?? []).map((row) => row.id as string)
  if (sessionIds.length === 0) return count('chat_messages')

  return count('chat_messages', (q) =>
    q.not('session_id', 'in', `(${sessionIds.join(',')})`)
  )
}

/**
 * Sums remaining user credit balances, excluding admin accounts.
 */
async function sumCreditsExcludingAdmins(adminIds: string[]): Promise<number> {
  let query = supabaseAdmin.from('user_credits').select('balance')
  query = excludeAdminUsers(query, adminIds)
  const { data, error } = await query
  if (error) throw new AppError(500, `user_credits sum: ${error.message}`)
  return (data ?? []).reduce((acc, row) => acc + (row.balance ?? 0), 0)
}

/**
 * Sums billing revenue, excluding payments from admin accounts.
 */
async function sumRevenueExcludingAdmins(adminIds: string[]): Promise<number> {
  let query = supabaseAdmin.from('billing_history').select('amount')
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
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const today = startOfTodayUTC()
    const fourteenDaysAgo = daysAgoUTC(13)
    const adminIds = await getAdminUserIds()

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
      creditsRemaining,
      revenue,
    ] = await Promise.all([
      count('users', (q) => q.neq('role', 'admin')),
      count('skills'),
      count('modules'),
      count('lessons'),
      count('chat_sessions', (q) => excludeAdminUsers(q, adminIds)),
      countChatMessagesExcludingAdmins(adminIds),
      count('lesson_progress', (q) =>
        excludeAdminUsers(q.eq('completed', true), adminIds)
      ),
      count('subscriptions', (q) =>
        excludeAdminUsers(q.eq('status', 'active'), adminIds)
      ),
      count('contact_messages'),
      sumCreditsExcludingAdmins(adminIds),
      sumRevenueExcludingAdmins(adminIds),
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

    // Signups per day over the last 14 days (non-admin only)
    const { data: signupRows, error: signupErr } = await supabaseAdmin
      .from('users')
      .select('created_at')
      .neq('role', 'admin')
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
