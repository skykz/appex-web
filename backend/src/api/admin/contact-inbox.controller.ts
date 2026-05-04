import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  unread: z
    .enum(['0', '1', 'true', 'false'])
    .optional()
    .transform((v) => v === '1' || v === 'true'),
})

/**
 * Lists contact / feedback messages with user email and read state for the support inbox.
 */
export async function listContactMessages(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { page, limit, unread } = listQuerySchema.parse(req.query)
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
