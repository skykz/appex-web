import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  lessonId: z.coerce.number().int().optional(),
  status: z.enum(['submitted', 'reviewed']).optional(),
})

const patchSchema = z.object({
  status: z.enum(['submitted', 'reviewed']).optional(),
  adminFeedback: z.string().max(8000).optional(),
  grade: z.string().max(120).nullable().optional(),
})

/**
 * Lists student lesson submissions with optional lesson filter and pagination.
 */
export async function listLessonSubmissions(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { page, limit, lessonId, status } = listQuerySchema.parse(req.query)
    const from = (page - 1) * limit
    const to = from + limit - 1

    let q = supabaseAdmin
      .from('lesson_submissions')
      .select(
        'id, user_id, lesson_id, message, attachment_url, status, admin_feedback, grade, created_at, users(email, name), lessons(title, label)',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })

    if (lessonId != null) {
      q = q.eq('lesson_id', lessonId)
    }
    if (status != null) {
      q = q.eq('status', status)
    }

    const { data, error, count } = await q.range(from, to)
    if (error) throw new AppError(500, error.message)

    const items = (data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id,
      user_id: r.user_id,
      user_email: (r.users as { email?: string } | null)?.email ?? '',
      user_name: (r.users as { name?: string } | null)?.name ?? '',
      lesson_id: r.lesson_id,
      lesson_label: (r.lessons as { label?: string } | null)?.label ?? '',
      lesson_title: (r.lessons as { title?: string } | null)?.title ?? '',
      message: r.message,
      attachment_url: r.attachment_url,
      status: r.status,
      admin_feedback: r.admin_feedback,
      grade: r.grade,
      created_at: r.created_at,
    }))

    res.json({ items, total: count ?? 0, page, limit })
  } catch (err) {
    next(err)
  }
}

/**
 * Updates review status and optional staff feedback on a student submission.
 */
export async function patchLessonSubmission(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = String(req.params.id)
    const body = patchSchema.parse(req.body)

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (body.status != null) patch.status = body.status
    if (body.adminFeedback !== undefined) patch.admin_feedback = body.adminFeedback
    if (body.grade !== undefined) patch.grade = body.grade?.trim() || null

    const { data, error } = await supabaseAdmin
      .from('lesson_submissions')
      .update(patch)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) throw new AppError(500, error.message)
    if (!data) throw new AppError(404, 'Submission not found')
    res.json(data)
  } catch (err) {
    next(err)
  }
}
