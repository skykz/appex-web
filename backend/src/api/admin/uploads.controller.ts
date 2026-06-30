import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { AppError } from '../../utils/error-handler.js'
import {
  MAX_LESSON_ASSET_BYTES,
  uploadLessonAssetFile,
} from '../../services/lesson-asset.service.js'

const lessonAssetUploadSchema = z.object({
  fileName: z.string().min(1).max(180),
  contentType: z.string().min(1).max(180).default('application/octet-stream'),
  size: z.number().int().min(1).max(MAX_LESSON_ASSET_BYTES),
  dataBase64: z.string().min(1),
})

/**
 * Accepts a base64 lesson asset from the admin UI and stores it in Supabase Storage.
 */
export async function uploadLessonAsset(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = lessonAssetUploadSchema.parse(req.body)
    const fileBuffer = Buffer.from(body.dataBase64, 'base64')
    if (fileBuffer.length !== body.size) {
      throw new AppError(400, 'Uploaded file payload is invalid. Please choose the file again.')
    }

    const url = await uploadLessonAssetFile({
      fileName: body.fileName,
      contentType: body.contentType,
      data: fileBuffer,
    })

    res.status(201).json({ url, fileName: body.fileName })
  } catch (err) {
    next(err)
  }
}
