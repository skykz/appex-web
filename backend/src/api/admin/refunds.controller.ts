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
  decision: z.enum(['approved', 'denied']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

const NULL_USER = '00000000-0000-0000-0000-000000000000'

/**
 * Lists refund decisions (approved and denied) for the admin Refunds queue.
 * Denied rows matter as much as approved ones — they are the record of what
 * support was asked for and turned down.
 */
export async function listAdminRefunds(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, decision, page, limit } = listQuerySchema.parse(req.query)
    const from = (page - 1) * limit
    const to = from + limit - 1

    let listQuery = supabaseAdmin
      .from('refund_requests')
      .select(
        'id, user_id, billing_history_id, decision, reason_code, reason_detail, days_since_purchase, lessons_opened, lessons_completed, is_renewal_charge, courtesy_applied, stripe_refund_id, processed_by, created_at',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })

    if (decision) {
      listQuery = listQuery.eq('decision', decision)
    }

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
          ilikeOrCondition('reason_code', search),
          ilikeOrCondition('reason_detail', search),
          ilikeOrCondition('stripe_refund_id', search),
        ]
        listQuery = listQuery.or(
          joinOrConditions(ids.length ? [...fieldConditions, inCondition('user_id', ids)] : fieldConditions)
        )
      }
    }

    const { data: rows, error, count } = await listQuery.range(from, to)
    if (error) throw new AppError(500, error.message)

    // Resolve both the refunded user and the admin who processed it.
    const userIds = [
      ...new Set([
        ...(rows ?? []).map((r) => r.user_id as string),
        ...(rows ?? []).map((r) => r.processed_by as string | null).filter((v): v is string => Boolean(v)),
      ]),
    ]
    const { data: users, error: uErr2 } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .in('id', userIds.length ? userIds : [NULL_USER])
    if (uErr2) throw new AppError(500, uErr2.message)
    const userMap = new Map((users ?? []).map((u) => [u.id as string, u]))

    // Amount lives on the billing row, not the refund row.
    const billingIds = (rows ?? [])
      .map((r) => r.billing_history_id as string | null)
      .filter((v): v is string => Boolean(v))
    const { data: billing, error: bErr } = await supabaseAdmin
      .from('billing_history')
      .select('id, amount, description, paid_at')
      .in('id', billingIds.length ? billingIds : [NULL_USER])
    if (bErr) throw new AppError(500, bErr.message)
    const billingMap = new Map((billing ?? []).map((b) => [b.id as string, b]))

    const items = (rows ?? []).map((r) => {
      const u = userMap.get(r.user_id as string)
      const processor = r.processed_by ? userMap.get(r.processed_by as string) : null
      const b = r.billing_history_id ? billingMap.get(r.billing_history_id as string) : null
      return {
        id: r.id as string,
        user_id: r.user_id as string,
        email: (u?.email as string | undefined) ?? '—',
        name: (u?.name as string | null) ?? null,
        decision: r.decision as 'approved' | 'denied',
        reason_code: r.reason_code as string,
        reason_detail: (r.reason_detail as string | null) ?? null,
        days_since_purchase: (r.days_since_purchase as number | null) ?? null,
        lessons_opened: (r.lessons_opened as number) ?? 0,
        lessons_completed: (r.lessons_completed as number) ?? 0,
        is_renewal_charge: Boolean(r.is_renewal_charge),
        courtesy_applied: Boolean(r.courtesy_applied),
        stripe_refund_id: (r.stripe_refund_id as string | null) ?? null,
        processed_by_email: (processor?.email as string | undefined) ?? null,
        amount: b?.amount != null ? Number(b.amount) : null,
        description: (b?.description as string | undefined) ?? null,
        paid_at: (b?.paid_at as string | undefined) ?? null,
        created_at: r.created_at as string,
      }
    })

    res.json({ items, total: count ?? 0, page, limit })
  } catch (err) {
    next(err)
  }
}
