import type { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'
import {
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
    const adminIds = await getAdminUserIds()

    const [
      usersTotal,
      skillsTotal,
      lessonsCompletedTotal,
      activeSubs,
      revenue,
    ] = await Promise.all([
      count('users', (q) => q.neq('role', 'admin')),
      count('skills'),
      count('lesson_progress', (q) =>
        excludeAdminUsers(q.eq('completed', true), adminIds)
      ),
      count('subscriptions', (q) =>
        excludeAdminUsers(q.eq('status', 'active'), adminIds)
      ),
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

    res.json({
      totals: {
        users: usersTotal,
        activeToday: activeTodayCount ?? 0,
        skills: skillsTotal,
        lessonsCompleted: lessonsCompletedTotal,
        activeSubscriptions: activeSubs,
        revenue,
      },
      recentUsers: recentUsers ?? [],
      recentLessonsCompleted,
    })
  } catch (err) {
    next(err)
  }
}
