import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'

const listQuerySchema = z.object({
  search: z
    .string()
    .optional()
    .transform((s) => (s?.trim() ? s.trim() : undefined)),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

/**
 * Escapes `%` and `_` for use inside PostgREST `ilike` patterns.
 */
function escapeIlikePattern(fragment: string): string {
  return fragment.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Returns true when `s` looks like a Postgres uuid string (for exact user id lookup).
 */
function isUuid(s: string): boolean {
  return UUID_RE.test(s)
}

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
        const safe = escapeIlikePattern(search).replace(/,/g, '')
        const pattern = `%${safe}%`
        listQuery = listQuery.or(`email.ilike.${pattern},name.ilike.${pattern}`)
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
