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
  limit: z.coerce.number().int().min(1).max(100).default(30),
  unread: z
    .enum(['0', '1', 'true', 'false'])
    .optional()
    .transform((v) => v === '1' || v === 'true'),
})

/**
 * Returns the number of unread contact / feedback messages for the inbox badge.
 */
export async function getContactUnreadCount(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { count, error } = await supabaseAdmin
      .from('contact_messages')
      .select('id', { count: 'exact', head: true })
      .is('read_at', null)
    if (error) throw new AppError(500, error.message)
    res.json({ unread: count ?? 0 })
  } catch (err) {
    next(err)
  }
}

/**
 * Marks every unread contact message as read (bulk inbox action).
 */
export async function markAllContactMessagesRead(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const readAt = new Date().toISOString()
    const { data, error } = await supabaseAdmin
      .from('contact_messages')
      .update({ read_at: readAt })
      .is('read_at', null)
      .select('id')
    if (error) throw new AppError(500, error.message)
    res.json({ updated: (data ?? []).length })
  } catch (err) {
    next(err)
  }
}

/**
 * Lists contact / feedback messages with user email and read state for the support inbox.
 */
export async function listContactMessages(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { search, page, limit, unread } = listQuerySchema.parse(req.query)
    const from = (page - 1) * limit
    const to = from + limit - 1

    let q = supabaseAdmin
      .from('contact_messages')
      .select('id, user_id, subject, message, category, read_at, created_at, users(email, name)', {
        count: 'exact',
      })
      .order('created_at', { ascending: false })

    if (unread === true) {
      q = q.is('read_at', null)
    }

    if (search) {
      if (isUuid(search)) {
        q = q.eq('user_id', search)
      } else {
        const { data: hitUsers, error: uErr } = await supabaseAdmin
          .from('users')
          .select('id')
          .or(joinOrConditions([ilikeOrCondition('email', search), ilikeOrCondition('name', search)]))
          .order('id')
          .limit(MAX_ID_FILTER)
        if (uErr) throw new AppError(500, uErr.message)
        const ids = (hitUsers ?? []).map((u) => u.id)
        const messageConditions = [
          ilikeOrCondition('subject', search),
          ilikeOrCondition('message', search),
          ilikeOrCondition('category', search),
        ]
        q = q.or(
          joinOrConditions(ids.length ? [...messageConditions, inCondition('user_id', ids)] : messageConditions)
        )
      }
    }

    const { data, error, count } = await q.range(from, to)
    if (error) throw new AppError(500, error.message)

    const rows = (data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id,
      user_id: r.user_id,
      email: (r.users as { email?: string } | null)?.email ?? '',
      name: (r.users as { name?: string } | null)?.name ?? '',
      subject: r.subject,
      message: r.message,
      category: r.category ?? 'general',
      read_at: r.read_at,
      created_at: r.created_at,
    }))

    res.json({ items: rows, total: count ?? 0, page, limit })
  } catch (err) {
    next(err)
  }
}

const patchSchema = z.object({
  read: z.boolean().optional(),
})

/**
 * Marks a support message as read (or toggles) for operator workflow.
 */
export async function patchContactMessage(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = String(req.params.id)
    const body = patchSchema.parse(req.body)
    const readAt =
      body.read === true ? new Date().toISOString() : body.read === false ? null : undefined

    const patch: Record<string, unknown> = {}
    if (readAt !== undefined) patch.read_at = readAt

    if (Object.keys(patch).length === 0) {
      throw new AppError(400, 'No updates')
    }

    const { data, error } = await supabaseAdmin
      .from('contact_messages')
      .update(patch)
      .eq('id', id)
      .select('id, read_at')
      .maybeSingle()

    if (error) throw new AppError(500, error.message)
    if (!data) throw new AppError(404, 'Message not found')
    res.json(data)
  } catch (err) {
    next(err)
  }
}
