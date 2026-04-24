import type { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'

export async function listAdminUsers(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, created_at')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw new AppError(500, error.message)

    const ids = (users ?? []).map((u) => u.id)

    const { data: credits } = await supabaseAdmin
      .from('user_credits')
      .select('user_id, balance')
      .in('user_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])

    const { data: streaks } = await supabaseAdmin
      .from('streaks')
      .select('user_id, current')
      .in('user_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])

    const creditMap = new Map((credits ?? []).map((c) => [c.user_id, c.balance]))
    const streakMap = new Map((streaks ?? []).map((s) => [s.user_id, s.current]))

    res.json(
      (users ?? []).map((u) => ({
        ...u,
        credits: creditMap.get(u.id) ?? 0,
        streak_current: streakMap.get(u.id) ?? 0,
      }))
    )
  } catch (err) {
    next(err)
  }
}
