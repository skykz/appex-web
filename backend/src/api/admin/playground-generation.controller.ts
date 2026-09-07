import type { NextFunction, Request, Response } from 'express'
import { z } from 'zod'
import { generatePlaygroundDraft } from '../../services/playground-generation.service.js'

const requestSchema = z.object({
  prompt: z.string().trim().min(1).max(12_000),
  lessonContext: z.string().max(20_000).optional(),
  documentUrl: z.string().url().or(z.literal('')).optional(),
  documentLabel: z.string().max(120).optional(),
})

export async function generateAdminPlaygroundDraft(req: Request, res: Response, next: NextFunction) {
  try {
    const body = requestSchema.parse(req.body)
    const draft = await generatePlaygroundDraft(body)
    res.status(201).json(draft)
  } catch (error) {
    next(error)
  }
}
