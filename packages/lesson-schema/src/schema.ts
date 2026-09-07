import { z } from 'zod'

/** Absolute URL or site-relative path (e.g. `/files/x.pdf`). */
export const urlOrPath = z.string().url().or(z.string().startsWith('/'))

/**
 * Image block `src`: remote URL, site path, or an inlined raster from admin (PNG/JPEG/WebP/GIF).
 */
export const imageSrcFlexible = z.union([
  urlOrPath,
  z
    .string()
    .regex(/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i, 'Use PNG, JPEG, WebP, or GIF'),
])

/** Trims list / quiz option lines coming from the admin textarea. */
export const cleanedStringArray = z.preprocess(
  (val) =>
    Array.isArray(val)
      ? val.map((x) => String(x).trim()).filter(Boolean)
      : typeof val === 'string'
        ? String(val)
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
  z.array(z.string().min(1))
)

/**
 * Quiz options: trims but deliberately does NOT drop blank entries.
 *
 * `cleanedStringArray` filters empties, which is fine for `list` items but
 * corrupts quizzes: `correctIndex` / `correctIndices` are positional, so
 * removing a blank row silently renumbers every option after it. An index that
 * shifts but stays in range then passes the bounds check and saves, and learners
 * are graded against the wrong option with no signal to the author. Keeping the
 * blanks means `z.string().min(1)` rejects them by position instead.
 */
const quizOptionArray = z.preprocess(
  (val) =>
    Array.isArray(val)
      ? val.map((x) => String(x).trim())
      : typeof val === 'string'
        ? String(val)
            .split('\n')
            .map((s) => s.trim())
        : [],
  z.array(z.string().min(1, 'Option text is required — remove the row instead of leaving it blank'))
)

/** Unified quiz block validated on lesson save (admin + API). */
export const quizBlockSchema = z.union([
  z
    .object({
      type: z.literal('quiz'),
      mode: z.literal('single'),
      question: z.string().trim().min(1).max(500),
      options: quizOptionArray.pipe(z.array(z.string().min(1)).min(2).max(12)),
      correctIndex: z.preprocess(
        (v) => {
          const n = Number(v)
          return Number.isFinite(n) ? n : 0
        },
        z.number().int().min(0)
      ),
      explanation: z.string().max(2000).optional(),
    })
    .superRefine((d, ctx) => {
      if (d.correctIndex >= d.options.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `correctIndex must be between 0 and ${d.options.length - 1}`,
          path: ['correctIndex'],
        })
      }
    }),
  z
    .object({
      type: z.literal('quiz'),
      mode: z.literal('multi'),
      question: z.string().trim().min(1).max(500),
      options: quizOptionArray.pipe(z.array(z.string().min(1)).min(2).max(12)),
      correctIndices: z.preprocess(
        (v) =>
          Array.isArray(v)
            ? v.map((x) => Number(x)).filter((n) => Number.isFinite(n))
            : typeof v === 'string'
              ? v
                  .split(',')
                  .map((s) => Number(s.trim()))
                  .filter((n) => Number.isFinite(n))
              : [],
        z.array(z.number().int().min(0)).min(1)
      ),
      explanation: z.string().max(2000).optional(),
    })
    .superRefine((d, ctx) => {
      const n = d.options.length
      if (d.correctIndices.some((i) => i < 0 || i >= n)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Each correct index must match an option row',
          path: ['correctIndices'],
        })
      }
    }),
  z.object({
    type: z.literal('quiz'),
    mode: z.literal('open'),
    question: z.string().trim().min(1).max(500),
    explanation: z.string().max(2000).optional(),
  }),
])

/** One rendered block inside a lesson step (stored JSON contract). */
export const lessonBlockSchema = z.union([
  z.object({ type: z.literal('text'), content: z.string() }),
  z.object({ type: z.literal('bold-text'), content: z.string() }),
  z.object({ type: z.literal('heading'), content: z.string() }),
  z.object({ type: z.literal('image'), src: imageSrcFlexible, alt: z.string().optional() }),
  z.object({
    type: z.literal('video'),
    src: urlOrPath,
    title: z.string().max(200).optional(),
    caption: z.string().max(500).optional(),
  }),
  z.object({
    type: z.literal('file'),
    url: urlOrPath,
    label: z.string().min(1).max(120),
    description: z.string().max(500).optional(),
  }),
  z.object({
    type: z.literal('link'),
    url: urlOrPath,
    label: z.string().min(1).max(120),
    description: z.string().max(500).optional(),
  }),
  quizBlockSchema,
  z.object({
    type: z.literal('submission'),
    prompt: z.string().min(1).max(500),
    acceptAttachment: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('callout'),
    variant: z.enum(['tip', 'note', 'warn']),
    title: z.string().max(120).optional(),
    content: z.string().trim().min(1).max(4000),
    collapsible: z.boolean().optional(),
    defaultOpen: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('table'),
    title: z.string().max(120).optional(),
    items: z.array(z.object({
      label: z.string().trim().min(1).max(120),
      content: z.string().trim().min(1).max(4000),
    })).min(2).max(12),
  }),
  z.object({
    type: z.literal('guide'),
    title: z.string().max(120).optional(),
    description: z.string().max(1000).optional(),
    steps: z.array(z.object({
      title: z.string().trim().min(1).max(120),
      content: z.string().trim().min(1).max(4000),
    })).min(2).max(20),
  }),
  z.object({
    type: z.literal('playground'),
    title: z.string().max(120).optional(),
    prompt: z.string().trim().min(1).max(12000),
    answer: z.string().trim().min(1).max(12000),
    documentUrl: urlOrPath.or(z.literal('')).optional(),
    documentLabel: z.string().max(120).optional(),
    previewUrl: urlOrPath.or(z.literal('')).optional(),
    previewLabel: z.string().max(120).optional(),
  }),
  z.object({
    type: z.literal('prompt'),
    title: z.string().trim().min(1).max(120),
    content: z.string().trim().min(1).max(12000),
  }),
  z.object({
    type: z.literal('list'),
    items: cleanedStringArray.pipe(z.array(z.string().min(1)).min(1)),
    checkable: z.boolean().optional(),
  }),
  z.object({ type: z.literal('user-message'), name: z.string(), text: z.string() }),
  z.object({ type: z.literal('mentor-message'), text: z.string() }),
])

export const lessonStepSchema = z.object({
  blocks: z.array(lessonBlockSchema).min(1),
})

/**
 * Catalog / lesson badge: emoji text, `https` image URL, `/path`, or `data:image/...;base64,` from admin.
 */
export const lessonEmoji = z.preprocess((v) => {
  const s = String(v ?? '').trim()
  return s.length > 0 ? s : '📘'
}, z.string().min(1).superRefine((s, ctx) => {
  if (/^data:image\//i.test(s)) {
    if (!/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(s)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Only PNG, JPEG, WebP, or GIF data URLs are allowed for uploaded images.',
      })
    }
    return
  }
  if (s.startsWith('http://') || s.startsWith('https://')) {
    if (s.length > 2048) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Image URL is too long (max 2048 characters).' })
      return
    }
    try {
      new URL(s)
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid image URL.' })
    }
    return
  }
  if (s.startsWith('/') && s.length <= 2048) return
  if (s.length <= 64) return
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: 'Use an emoji, a short text badge (≤64 chars), an image URL, a path, or upload an image.',
  })
}))

export const lessonCreateSchema = z.object({
  label: z.string().min(1),
  title: z.string().min(1),
  emoji: z.string().optional().default(''),
  content: z.array(lessonStepSchema).min(1),
  is_visible: z.boolean().default(false),
  order: z.coerce.number().int().min(0).default(0),
})

export const lessonUpdateSchema = lessonCreateSchema.partial()

/**
 * Admin lesson editor form (`steps` is the field name; API expects `content`).
 * Drops steps that have no blocks, then validates with the same rules as the persisted lesson payload.
 */
export const lessonEditorFormSchema = z.object({
  label: z.string().min(1),
  title: z.string().min(1),
  is_visible: z.boolean().default(false),
  order: z.preprocess(
    (v) => {
      if (v === '' || v === null || v === undefined) return 0
      if (typeof v === 'number' && Number.isNaN(v)) return 0
      const n = Number(v)
      return Number.isFinite(n) ? n : 0
    },
    z.number().int().min(0)
  ),
  steps: z.preprocess(
    (raw) => {
      if (!Array.isArray(raw)) return []
      return raw
        .map((step) => {
          if (!step || typeof step !== 'object') return { blocks: [] as unknown[] }
          const b = (step as { blocks?: unknown }).blocks
          const blocks = Array.isArray(b) ? b : []
          return { blocks }
        })
        .filter((step) => step.blocks.length > 0)
    },
    z
      .array(lessonStepSchema)
      .min(1, { message: 'Add at least one step with at least one block.' })
  ),
})

export type LessonBlock = z.infer<typeof lessonBlockSchema>
export type LessonStep = z.infer<typeof lessonStepSchema>
export type LessonCreateInput = z.infer<typeof lessonCreateSchema>
export type LessonEditorFormValues = z.infer<typeof lessonEditorFormSchema>
