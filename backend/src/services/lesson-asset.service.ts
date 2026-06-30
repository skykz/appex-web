import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '../db/supabase.js'
import { AppError } from '../utils/error-handler.js'

export const LESSON_ASSETS_BUCKET = 'lesson-assets'
export const MAX_LESSON_ASSET_BYTES = 20 * 1024 * 1024

/**
 * Produces a storage-safe filename while preserving the original extension when possible.
 */
export function safeLessonAssetFileName(name: string): string {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[^\w.\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
  return (cleaned || 'lesson-file').slice(0, 140)
}

/**
 * Uploads a CMS lesson asset to Supabase Storage and returns its public URL.
 */
export async function uploadLessonAssetFile(args: {
  fileName: string
  contentType: string
  data: Buffer
}): Promise<string> {
  if (args.data.length > MAX_LESSON_ASSET_BYTES) {
    throw new AppError(400, 'File is too large. Maximum size is 20 MB.')
  }

  const path = `files/${Date.now()}-${randomUUID()}-${safeLessonAssetFileName(args.fileName)}`
  const { error } = await supabaseAdmin.storage
    .from(LESSON_ASSETS_BUCKET)
    .upload(path, args.data, {
      contentType: args.contentType,
      upsert: false,
    })

  if (error) throw new AppError(500, error.message)

  const { data } = supabaseAdmin.storage.from(LESSON_ASSETS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
