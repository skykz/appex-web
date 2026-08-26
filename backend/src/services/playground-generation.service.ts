import OpenAI, { APIError as OpenAIAPIError } from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import { env } from '../config/env.js'
import { AppError } from '../utils/error-handler.js'
import { uploadLessonAssetFile } from './lesson-asset.service.js'

const MAX_SOURCE_BYTES = 20 * 1024 * 1024
const MAX_OUTPUT_CHARS = 300_000

const generatedDraftSchema = z.object({
  answer: z.string().trim().min(1).max(12_000),
  outputFile: z.object({
    fileName: z.string().trim().min(1).max(120),
    contentType: z.enum(['text/html', 'text/markdown', 'text/plain', 'text/csv', 'application/json']),
    content: z.string().max(MAX_OUTPUT_CHARS),
  }).nullable(),
})

export type PlaygroundGenerationResult = {
  answer: string
  previewUrl?: string
  previewLabel?: string
}

async function loadSourceFile(url: string, label?: string) {
  let source: URL
  let storageOrigin: string
  try {
    source = new URL(url)
    storageOrigin = new URL(env.SUPABASE_URL).origin
  } catch {
    throw new AppError(400, 'The input document URL is invalid.')
  }
  if (source.origin !== storageOrigin || !source.pathname.includes('/storage/')) {
    throw new AppError(400, 'Upload the input document through the lesson editor before generating.')
  }
  const response = await fetch(source, { redirect: 'error' })
  if (!response.ok) throw new AppError(400, 'The input document could not be downloaded.')
  const declaredSize = Number(response.headers.get('content-length') || 0)
  if (declaredSize > MAX_SOURCE_BYTES) throw new AppError(400, 'The input document is too large.')
  const data = Buffer.from(await response.arrayBuffer())
  if (!data.length || data.length > MAX_SOURCE_BYTES) throw new AppError(400, 'The input document is empty or too large.')
  return {
    fileName: (label?.trim() || decodeURIComponent(source.pathname.split('/').pop() || 'source-file')).slice(0, 180),
    contentType: response.headers.get('content-type')?.split(';')[0] || 'application/octet-stream',
    data,
  }
}

/** Generates an editable Playground draft. Nothing is published until the admin saves the lesson. */
export async function generatePlaygroundDraft(args: {
  prompt: string
  lessonContext?: string
  documentUrl?: string
  documentLabel?: string
}): Promise<PlaygroundGenerationResult> {
  const apiKey = env.OPENAI_API_KEY?.trim()
  if (!apiKey) throw new AppError(503, 'OpenAI is not configured (missing OPENAI_API_KEY).')
  const source = args.documentUrl ? await loadSourceFile(args.documentUrl, args.documentLabel) : null
  const client = new OpenAI({ apiKey })
  const userContent: Array<Record<string, unknown>> = [
    { type: 'input_text', text: args.prompt },
  ]
  if (source) {
    if (source.contentType.startsWith('image/')) {
      userContent.push({ type: 'input_image', image_url: `data:${source.contentType};base64,${source.data.toString('base64')}`, detail: 'high' })
    } else {
      userContent.push({ type: 'input_file', filename: source.fileName, file_data: `data:${source.contentType};base64,${source.data.toString('base64')}` })
    }
  }

  try {
    const response = await client.responses.parse({
      model: env.OPENAI_CHAT_MODEL?.trim() || 'gpt-4o',
      store: false,
      input: [
        {
          role: 'developer',
          content: `Create a polished answer for an interactive course exercise. The result is a draft for an administrator to review, not a live learner response. Use the lesson context only to stay relevant. Write the answer as clean plain text with readable line breaks; do not use Markdown heading markers. If the prompt explicitly needs a downloadable artifact, also create exactly one complete file using HTML, Markdown, plain text, CSV, or JSON. Prefer HTML for interactive previews and Markdown for documents. Otherwise outputFile must be null. Never include secrets or remote scripts.\n\nLesson context:\n${(args.lessonContext || 'No additional context.').slice(0, 20_000)}`,
        },
        { role: 'user', content: userContent as never },
      ],
      text: { format: zodTextFormat(generatedDraftSchema, 'playground_draft') },
    })
    const draft = response.output_parsed
    if (!draft) throw new AppError(502, 'OpenAI returned no Playground draft.')
    if (!draft.outputFile) return { answer: draft.answer }
    const previewUrl = await uploadLessonAssetFile({
      fileName: draft.outputFile.fileName,
      contentType: draft.outputFile.contentType,
      data: Buffer.from(draft.outputFile.content, 'utf8'),
    })
    return { answer: draft.answer, previewUrl, previewLabel: draft.outputFile.fileName }
  } catch (error) {
    if (error instanceof AppError) throw error
    if (error instanceof OpenAIAPIError) {
      throw new AppError(error.status || 502, error.message || 'OpenAI generation failed.')
    }
    throw new AppError(502, error instanceof Error ? error.message : 'Playground generation failed.')
  }
}
