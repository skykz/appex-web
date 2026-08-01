import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'
import { ilikeOrCondition, isUuid, joinOrConditions } from '../../utils/admin-search.js'
import { recordAdminAction } from '../../services/admin-audit.service.js'

const listQuerySchema = z.object({
  search: z
    .string()
    .optional()
    .transform((s) => (s?.trim() ? s.trim() : undefined)),
  /**
   * Email-confirmation state, which is NOT the same thing as having an account:
   * a lead can confirm their address and never pay. Defaults to 'unconfirmed'
   * because that is the list the admin UI opens on.
   */
  status: z.enum(['unconfirmed', 'confirmed', 'all']).default('unconfirmed'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

/**
 * Lists funnel leads from `landing_quiz_submissions` — people who submitted an email
 * in the quiz but have no account (`user_id IS NULL`). Paying users live in `users`
 * and are served by `listAdminUsers`, so the two lists never overlap.
 *
 * The `status` filter splits these leads by whether they clicked the emailed
 * confirmation link (`confirmed_at`).
 */
export async function listAdminLeads(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, status, page, limit } = listQuerySchema.parse(req.query)
    const from = (page - 1) * limit
    const to = from + limit - 1

    let listQuery = supabaseAdmin
      .from('landing_quiz_submissions')
      .select(
        'id, email, name, landing, selected_plan, utm_source, utm_campaign, utm_medium, welcome_email_sent_at, confirmed_at, confirm_email_sent_at, created_at',
        { count: 'exact' }
      )
      .is('user_id', null)
      .order('created_at', { ascending: false })

    if (status === 'unconfirmed') listQuery = listQuery.is('confirmed_at', null)
    else if (status === 'confirmed') listQuery = listQuery.not('confirmed_at', 'is', null)

    if (search) {
      if (isUuid(search)) {
        listQuery = listQuery.eq('id', search)
      } else {
        listQuery = listQuery.or(
          joinOrConditions([ilikeOrCondition('email', search), ilikeOrCondition('name', search)])
        )
      }
    }

    const { data, error, count } = await listQuery.range(from, to)

    if (error) throw new AppError(500, error.message)

    const items = (data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id,
      email: r.email ?? '',
      name: r.name ?? '',
      landing: r.landing ?? '',
      selected_plan: r.selected_plan ?? null,
      utm_source: r.utm_source ?? null,
      utm_campaign: r.utm_campaign ?? null,
      utm_medium: r.utm_medium ?? null,
      welcome_email_sent_at: r.welcome_email_sent_at ?? null,
      confirmed_at: r.confirmed_at ?? null,
      confirm_email_sent_at: r.confirm_email_sent_at ?? null,
      created_at: r.created_at,
    }))

    res.json({ items, total: count ?? 0, page, limit })
  } catch (err) {
    next(err)
  }
}

/**
 * Deletes one funnel lead.
 *
 * Scoped to `user_id IS NULL` on purpose: this endpoint must never be able to
 * remove the quiz row belonging to a paying customer. That row is what links a
 * purchase back to the answers behind it, and deleting it would silently break
 * attribution reporting. A lead that converted is therefore reported as
 * not-found rather than deleted.
 *
 * Irreversible — it takes the learner's quiz answers and confirmation state with
 * it — so the action is written to the admin audit log either way.
 */
export async function deleteAdminLead(req: Request, res: Response, next: NextFunction) {
  // Express 5 types route params as string | string[]; normalise before use.
  const id = String(req.params.id ?? '')

  try {
    if (!isUuid(id)) throw new AppError(400, 'Invalid lead id.')

    // Read first so the audit entry records WHICH address was removed; after the
    // delete the row is gone and the log would only carry an opaque uuid.
    const { data: lead, error: readErr } = await supabaseAdmin
      .from('landing_quiz_submissions')
      .select('id, email, name, landing, user_id')
      .eq('id', id)
      .is('user_id', null)
      .maybeSingle()

    if (readErr) throw new AppError(500, readErr.message)
    if (!lead) throw new AppError(404, 'Lead not found.')

    const { error: delErr } = await supabaseAdmin
      .from('landing_quiz_submissions')
      .delete()
      .eq('id', id)
      // Re-assert the guard on the write itself: between the read and here the
      // lead could have paid, and the row would no longer be ours to delete.
      .is('user_id', null)

    if (delErr) {
      await recordAdminAction(req, {
        action: 'lead.delete',
        targetType: 'landing_lead',
        targetId: id,
        metadata: { email: lead.email },
        error: delErr.message,
      })
      throw new AppError(500, delErr.message)
    }

    await recordAdminAction(req, {
      action: 'lead.delete',
      targetType: 'landing_lead',
      targetId: id,
      metadata: { email: lead.email, name: lead.name, landing: lead.landing },
    })

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}
