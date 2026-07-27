import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'
import { recordAdminAction } from '../../services/admin-audit.service.js'

const listQuerySchema = z.object({
  /** 'open' is the default view: the queue of things still needing a human. */
  status: z.enum(['open', 'resolved', 'all']).default('open'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

const resolveBodySchema = z.object({
  /** Free-text note describing what was done in Stripe to fix it. */
  note: z.string().trim().max(2000).optional(),
  /** Pass false to reopen a previously resolved alert. */
  resolved: z.boolean().optional().default(true),
})

/**
 * Returns how many billing alerts are still unresolved, for the sidebar badge.
 */
export async function getBillingAlertsOpenCount(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { count, error } = await supabaseAdmin
      .from('billing_alerts')
      .select('id', { count: 'exact', head: true })
      .is('resolved_at', null)
    if (error) throw new AppError(500, error.message)
    res.json({ open: count ?? 0 })
  } catch (err) {
    next(err)
  }
}

/**
 * Lists billing alerts for the operator queue. These rows mean a paying customer
 * is in a wrong billing state right now — e.g. a "1 Week" subscription still on
 * the weekly price — so the open queue is the default and is ordered newest first.
 */
export async function listBillingAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, page, limit } = listQuerySchema.parse(req.query)
    const from = (page - 1) * limit
    const to = from + limit - 1

    let q = supabaseAdmin
      .from('billing_alerts')
      .select(
        'id, alert_type, user_id, email, stripe_subscription_id, stripe_customer_id, stripe_checkout_session_id, detail, context, resolved_at, resolved_note, created_at',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })

    if (status === 'open') q = q.is('resolved_at', null)
    else if (status === 'resolved') q = q.not('resolved_at', 'is', null)

    const { data, error, count } = await q.range(from, to)
    if (error) throw new AppError(500, error.message)

    const items = (data ?? []).map((r) => ({
      id: r.id as string,
      alert_type: r.alert_type as string,
      user_id: (r.user_id as string | null) ?? null,
      email: (r.email as string | null) ?? null,
      stripe_subscription_id: (r.stripe_subscription_id as string | null) ?? null,
      stripe_customer_id: (r.stripe_customer_id as string | null) ?? null,
      stripe_checkout_session_id: (r.stripe_checkout_session_id as string | null) ?? null,
      detail: (r.detail as string | null) ?? null,
      context: (r.context as Record<string, unknown> | null) ?? {},
      resolved_at: (r.resolved_at as string | null) ?? null,
      resolved_note: (r.resolved_note as string | null) ?? null,
      created_at: r.created_at as string,
    }))

    res.json({ items, total: count ?? 0, page, limit })
  } catch (err) {
    next(err)
  }
}

/**
 * Marks an alert resolved (or reopens it), recording who did it in the audit log.
 */
export async function patchBillingAlert(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id)
    const { note, resolved } = resolveBodySchema.parse(req.body ?? {})

    const { data, error } = await supabaseAdmin
      .from('billing_alerts')
      .update({
        resolved_at: resolved ? new Date().toISOString() : null,
        resolved_note: resolved ? (note ?? null) : null,
      })
      .eq('id', id)
      .select('id, alert_type, stripe_subscription_id, resolved_at, resolved_note')
      .maybeSingle()

    if (error) throw new AppError(500, error.message)
    if (!data) throw new AppError(404, 'Alert not found')

    await recordAdminAction(req, {
      action: resolved ? 'billing_alert.resolved' : 'billing_alert.reopened',
      targetType: 'billing_alert',
      targetId: id,
      metadata: {
        alertType: data.alert_type,
        stripeSubscriptionId: data.stripe_subscription_id,
        note: note ?? null,
      },
    })

    res.json(data)
  } catch (err) {
    next(err)
  }
}
