import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'
import { ilikeOrCondition, isUuid, joinOrConditions } from '../../utils/admin-search.js'

const listQuerySchema = z.object({
  search: z
    .string()
    .optional()
    .transform((s) => (s?.trim() ? s.trim() : undefined)),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

/**
 * Lists admin users with optional `search` (email/name ilike) and cursor-style pagination.
 */
export async function listAdminUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, page, limit } = listQuerySchema.parse(req.query)
    const from = (page - 1) * limit
    const to = from + limit - 1

    let listQuery = supabaseAdmin
      .from('users')
      .select('id, email, name, role, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (search) {
      if (isUuid(search)) {
        listQuery = listQuery.eq('id', search)
      } else {
        listQuery = listQuery.or(
          joinOrConditions([ilikeOrCondition('email', search), ilikeOrCondition('name', search)])
        )
      }
    }

    const { data: users, error, count } = await listQuery.range(from, to)

    if (error) throw new AppError(500, error.message)

    const total = count ?? 0
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

    const items = (users ?? []).map((u) => ({
      ...u,
      credits: creditMap.get(u.id) ?? 0,
      streak_current: streakMap.get(u.id) ?? 0,
    }))

    res.json({ items, total, page, limit })
  } catch (err) {
    next(err)
  }
}
