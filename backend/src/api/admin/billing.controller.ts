import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'
import { ilikeOrCondition, inCondition, isUuid, joinOrConditions, MAX_ID_FILTER } from '../../utils/admin-search.js'

const listQuerySchema = z.object({
  search: z
    .string()
    .optional()
    .transform((s) => (s?.trim() ? s.trim() : undefined)),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

const NULL_USER = '00000000-0000-0000-0000-000000000000'

/**
 * Coerces Supabase numeric / string values to a JS number for JSON output.
 */
function toNum(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

/**
 * Returns admin-facing subscription rows with user email and name, with optional search and pagination.
 */
export async function listAdminSubscriptions(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { search, page, limit } = listQuerySchema.parse(req.query)
    const from = (page - 1) * limit
    const to = from + limit - 1

    let listQuery = supabaseAdmin
      .from('subscriptions')
      .select(
        'id, user_id, plan_name, status, intro_price, price, coupon_label, promo_code, renewal_date, paused_at, created_at',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })

    if (search) {
      if (isUuid(search)) {
        listQuery = listQuery.eq('user_id', search)
      } else {
        const { data: hitUsers, error: uErr } = await supabaseAdmin
          .from('users')
          .select('id')
          .or(joinOrConditions([ilikeOrCondition('email', search), ilikeOrCondition('name', search)]))
          .order('id')
          .limit(MAX_ID_FILTER)
        if (uErr) throw new AppError(500, uErr.message)
        const ids = (hitUsers ?? []).map((u) => u.id)
        const fieldConditions = [
          ilikeOrCondition('plan_name', search),
          ilikeOrCondition('coupon_label', search),
          ilikeOrCondition('promo_code', search),
        ]
        listQuery = listQuery.or(
          joinOrConditions(ids.length ? [...fieldConditions, inCondition('user_id', ids)] : fieldConditions)
        )
      }
    }

    const { data: rows, error, count } = await listQuery.range(from, to)
    if (error) throw new AppError(500, error.message)

    const userIds = [...new Set((rows ?? []).map((r) => r.user_id as string))]
    const { data: users, error: u2 } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .in('id', userIds.length ? userIds : [NULL_USER])
    if (u2) throw new AppError(500, u2.message)

    const userMap = new Map((users ?? []).map((u) => [u.id as string, u]))

    const items = (rows ?? []).map((r) => {
      const u = userMap.get(r.user_id as string)
      return {
        id: r.id as string,
        user_id: r.user_id as string,
        email: u?.email ?? '—',
        name: (u?.name as string | null) ?? null,
        plan_name: r.plan_name as string,
        status: r.status as string,
        intro_price: r.intro_price != null ? toNum(r.intro_price) : null,
        price: toNum(r.price),
        coupon_label: (r.coupon_label as string | null) ?? null,
        promo_code: (r.promo_code as string | null) ?? null,
        renewal_date: r.renewal_date as string,
        paused_at: (r.paused_at as string | null) ?? null,
        created_at: r.created_at as string,
      }
    })

    res.json({ items, total: count ?? 0, page, limit })
  } catch (err) {
    next(err)
  }
}

/**
 * Returns billing history rows with user email and name for admin review.
 */
export async function listAdminBillingHistory(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { search, page, limit } = listQuerySchema.parse(req.query)
    const from = (page - 1) * limit
    const to = from + limit - 1

    let listQuery = supabaseAdmin
      .from('billing_history')
      .select(
        'id, user_id, amount, subtotal, discount_amount, coupon_label, promo_code, description, paid_at, created_at',
        { count: 'exact' }
      )
      .order('paid_at', { ascending: false })

    if (search) {
      if (isUuid(search)) {
        listQuery = listQuery.eq('user_id', search)
      } else {
        const { data: hitUsers, error: uErr } = await supabaseAdmin
          .from('users')
          .select('id')
          .or(joinOrConditions([ilikeOrCondition('email', search), ilikeOrCondition('name', search)]))
          .order('id')
          .limit(MAX_ID_FILTER)
        if (uErr) throw new AppError(500, uErr.message)
        const ids = (hitUsers ?? []).map((u) => u.id)
        const fieldConditions = [
          ilikeOrCondition('description', search),
          ilikeOrCondition('coupon_label', search),
          ilikeOrCondition('promo_code', search),
        ]
        listQuery = listQuery.or(
          joinOrConditions(ids.length ? [...fieldConditions, inCondition('user_id', ids)] : fieldConditions)
        )
      }
    }

    const { data: rows, error, count } = await listQuery.range(from, to)
    if (error) throw new AppError(500, error.message)

    const userIds = [...new Set((rows ?? []).map((r) => r.user_id as string))]
    const { data: users, error: u2 } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .in('id', userIds.length ? userIds : [NULL_USER])
    if (u2) throw new AppError(500, u2.message)

    const userMap = new Map((users ?? []).map((u) => [u.id as string, u]))

    const items = (rows ?? []).map((r) => {
      const u = userMap.get(r.user_id as string)
      return {
        id: r.id as string,
        user_id: r.user_id as string,
        email: u?.email ?? '—',
        name: (u?.name as string | null) ?? null,
        amount: toNum(r.amount),
        subtotal: r.subtotal != null ? toNum(r.subtotal) : null,
        discount_amount: toNum(r.discount_amount),
        coupon_label: (r.coupon_label as string | null) ?? null,
        promo_code: (r.promo_code as string | null) ?? null,
        description: r.description as string,
        paid_at: r.paid_at as string,
        created_at: r.created_at as string,
      }
    })

    res.json({ items, total: count ?? 0, page, limit })
  } catch (err) {
    next(err)
  }
}
