import type { Request, Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from '../../types/index.js'
import { z } from 'zod'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'

const contactSchema = z.object({
  subject: z.string().min(1),
  message: z.string().min(1),
  category: z
    .enum(['general', 'bug', 'billing', 'content', 'feedback', 'other'])
    .default('general'),
})

export async function submitContact(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    const body = contactSchema.parse(req.body)

    const { error } = await supabaseAdmin.from('contact_messages').insert({
      user_id: userId,
      subject: body.subject,
      message: body.message,
      category: body.category,
    })

    if (error) throw new AppError(500, error.message)

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}
