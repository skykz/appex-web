import type { NextFunction, Request, Response } from 'express'
import { z } from 'zod'
import { AppError } from '../../utils/error-handler.js'
import { generateLessonFromDocx, generateModuleFromZip } from '../../services/lesson-import.service.js'

const MAX_DOCX_BYTES = 12 * 1024 * 1024

const lessonImportSchema = z.object({
  fileName: z.string().trim().min(1).max(180),
  contentType: z.string().trim().max(180).optional(),
  dataBase64: z.string().min(1).max(Math.ceil((MAX_DOCX_BYTES * 4) / 3) + 16),
})

/** Builds an editable hidden lesson draft from one admin-uploaded DOCX. */
export async function generateLessonImport(req: Request, res: Response, next: NextFunction) {
  try {
    const body = lessonImportSchema.parse(req.body)
    if (!body.fileName.toLowerCase().endsWith('.docx')) {
      throw new AppError(400, 'Upload a DOCX file.')
    }
    const data = Buffer.from(body.dataBase64, 'base64')
    if (data.length === 0 || data.length > MAX_DOCX_BYTES) {
      throw new AppError(400, 'The DOCX must be between 1 byte and 12 MB.')
    }

    const draft = await generateLessonFromDocx({ fileName: body.fileName, data })
    res.status(201).json(draft)
  } catch (error) {
    next(error)
  }
}

/** Builds hidden lesson drafts from all DOCX files in one module ZIP. */
export async function generateModuleImport(req: Request, res: Response, next: NextFunction) {
  try {
    const body = lessonImportSchema.parse(req.body)
    if (!body.fileName.toLowerCase().endsWith('.zip')) {
      throw new AppError(400, 'Upload a ZIP file containing DOCX lessons.')
    }
    const data = Buffer.from(body.dataBase64, 'base64')
    if (data.length === 0 || data.length > MAX_DOCX_BYTES) {
      throw new AppError(400, 'The ZIP must be between 1 byte and 12 MB.')
    }

    const draft = await generateModuleFromZip({ fileName: body.fileName, data })
    res.status(201).json(draft)
  } catch (error) {
    next(error)
  }
}
