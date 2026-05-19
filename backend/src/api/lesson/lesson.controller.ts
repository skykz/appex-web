import type { Request, Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from '../../types/index.js'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'
import { stripQuizAnswersFromSteps } from '@appex/lesson-schema'

const progressSchema = z.object({
  stepIndex: z.number().int().min(0),
})

const completeSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  feedback: z.string().optional(),
})

/**
 * Loads a lesson only if the lesson and every catalog ancestor is visible to learners.
 */
async function getVisibleLessonOrThrow(lessonId: number) {
  const { data: lesson, error } = await supabaseAdmin
    .from('lessons')
    .select('*')
    .eq('id', lessonId)
    .eq('is_visible', true)
    .single()
  if (error || !lesson) throw new AppError(404, 'Lesson not found')

  const { data: mod, error: moduleError } = await supabaseAdmin
    .from('modules')
    .select('id, skill_id')
    .eq('id', lesson.module_id)
    .eq('is_visible', true)
    .single()
  if (moduleError || !mod) throw new AppError(404, 'Lesson not found')

  const { data: skill, error: skillError } = await supabaseAdmin
    .from('skills')
    .select('id, category')
    .eq('id', mod.skill_id)
    .eq('is_visible', true)
    .single()
  if (skillError || !skill) throw new AppError(404, 'Lesson not found')

  const { data: category, error: categoryError } = await supabaseAdmin
    .from('categories')
    .select('slug')
    .eq('slug', skill.category)
    .eq('is_visible', true)
    .single()
  if (categoryError || !category) throw new AppError(404, 'Lesson not found')

  return { lesson, module: mod, skill }
}

export async function getLesson(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    const lessonId = Number(req.params.id)

    const { lesson } = await getVisibleLessonOrThrow(lessonId)

    // Fetch user progress
    const { data: progress } = await supabaseAdmin
      .from('lesson_progress')
      .select('step_index, completed')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .maybeSingle()

    res.json({
      id: lesson.id,
      label: lesson.label,
      title: lesson.title,
      steps: stripQuizAnswersFromSteps(lesson.content),
      progress: {
        stepIndex: progress?.step_index ?? 0,
        completed: progress?.completed ?? false,
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function updateProgress(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    const lessonId = Number(req.params.id)
    const body = progressSchema.parse(req.body)
    await getVisibleLessonOrThrow(lessonId)

    const { data, error } = await supabaseAdmin
      .from('lesson_progress')
      .upsert(
        {
          user_id: userId,
          lesson_id: lessonId,
          step_index: body.stepIndex,
        },
        { onConflict: 'user_id,lesson_id' }
      )
      .select()
      .single()

    if (error) throw new AppError(500, error.message)

    res.json(data)
  } catch (err) {
    next(err)
  }
}

export async function completeLesson(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    const lessonId = Number(req.params.id)
    const body = completeSchema.parse(req.body)
    const visible = await getVisibleLessonOrThrow(lessonId)

    // Mark lesson complete
    const { data, error } = await supabaseAdmin
      .from('lesson_progress')
      .upsert(
        {
          user_id: userId,
          lesson_id: lessonId,
          completed: true,
          rating: body.rating ?? null,
          feedback: body.feedback ?? null,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,lesson_id' }
      )
      .select()
      .single()

    if (error) throw new AppError(500, error.message)

    await recalculateSkillProgress(userId, visible.module.skill_id)

    res.json(data)
  } catch (err) {
    next(err)
  }
}

async function recalculateSkillProgress(userId: string, skillId: number) {
  // Get all lessons for this skill
  const { data: modules } = await supabaseAdmin
    .from('modules')
    .select('id')
    .eq('skill_id', skillId)
    .eq('is_visible', true)

  const moduleIds = (modules ?? []).map((m) => m.id)
  if (moduleIds.length === 0) return

  const { data: lessons } = await supabaseAdmin
    .from('lessons')
    .select('id')
    .eq('is_visible', true)
    .in('module_id', moduleIds)

  const lessonIds = (lessons ?? []).map((l) => l.id)
  if (lessonIds.length === 0) return

  const { data: completed } = await supabaseAdmin
    .from('lesson_progress')
    .select('lesson_id')
    .eq('user_id', userId)
    .eq('completed', true)
    .in('lesson_id', lessonIds)

  const completedCount = completed?.length ?? 0
  const totalCount = lessonIds.length
  const progress = Math.round((completedCount / totalCount) * 100)

  const status =
    progress === 0
      ? 'not_started'
      : progress === 100
        ? 'completed'
        : 'in_progress'

  await supabaseAdmin.from('skill_progress').upsert(
    {
      user_id: userId,
      skill_id: skillId,
      progress,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,skill_id' }
  )
}

const quizCheckSchema = z.object({
  stepIndex: z.number().int().min(0),
  blockIndex: z.number().int().min(0),
  selectedIndices: z.array(z.number().int().min(0)).optional().default([]),
  openAnswer: z.string().max(8000).optional(),
})

const submissionBodySchema = z
  .object({
    message: z.string().max(8000).optional(),
    attachmentUrl: z.string().url().or(z.string().startsWith('/')).optional(),
  })
  .refine((body) => Boolean(body.message?.trim() || body.attachmentUrl), {
    message: 'Add a message or attach a file before submitting.',
  })

const MAX_SUBMISSION_FILE_BYTES = 15 * 1024 * 1024
const SUBMISSION_BUCKET = 'lesson-submissions'

const submissionFileSchema = z.object({
  fileName: z.string().min(1).max(180),
  contentType: z.string().min(1).max(180).default('application/octet-stream'),
  size: z.number().int().min(1).max(MAX_SUBMISSION_FILE_BYTES),
  dataBase64: z.string().min(1),
})

/**
 * Produces a storage-safe filename while preserving enough of the original name for admins.
 */
function safeFileName(name: string): string {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[^\w.\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
  return (cleaned || 'submission-file').slice(0, 140)
}

/**
 * Uploads a learner file to Supabase Storage and returns the public URL stored with the submission.
 */
async function uploadSubmissionFile(args: {
  userId: string
  lessonId: number
  fileName: string
  contentType: string
  data: Buffer
}): Promise<string> {
  const stamp = `${Date.now()}-${randomUUID()}`
  const path = `${args.userId}/${args.lessonId}/${stamp}-${safeFileName(args.fileName)}`
  const { error } = await supabaseAdmin.storage
    .from(SUBMISSION_BUCKET)
    .upload(path, args.data, {
      contentType: args.contentType,
      upsert: false,
    })
  if (error) throw new AppError(500, error.message)

  const { data } = supabaseAdmin.storage.from(SUBMISSION_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Validates a quiz answer against stored CMS content and logs the attempt (answers never ship to the client).
 */
export async function checkQuizAnswer(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    const lessonId = Number(req.params.id)
    const body = quizCheckSchema.parse(req.body)
    const visible = await getVisibleLessonOrThrow(lessonId)

    const steps = visible.lesson.content as Array<{ blocks?: unknown[] }>
    const step = steps[body.stepIndex]
    const block = step?.blocks?.[body.blockIndex]
    if (!block || typeof block !== 'object' || !('type' in block)) {
      throw new AppError(400, 'Invalid quiz location')
    }
    const t = (block as { type: string }).type
    const rawMode =
      t === 'quiz' ? (block as unknown as { mode?: string }).mode : undefined
    const mode =
      typeof rawMode === 'string'
        ? rawMode
        : t === 'quiz-single'
          ? 'single'
          : t === 'quiz-multi'
            ? 'multi'
            : null

    if (mode !== 'single' && mode !== 'multi' && mode !== 'open') {
      throw new AppError(400, 'Block is not a quiz')
    }

    let isCorrect = false
    let explanation: string | undefined
    let correctIndices: number[] = []

    if (mode === 'open') {
      const b = block as unknown as { explanation?: string }
      explanation = b.explanation
      const text = (body.openAnswer ?? '').trim()
      if (!text) throw new AppError(400, 'Please enter an answer')
      isCorrect = true
      await supabaseAdmin.from('lesson_quiz_attempts').insert({
        user_id: userId,
        lesson_id: lessonId,
        step_index: body.stepIndex,
        block_index: body.blockIndex,
        selected_indices: [],
        is_correct: isCorrect,
        open_response: text,
      })
      res.json({
        correct: isCorrect,
        explanation: explanation ?? null,
      })
      return
    }

    if (mode === 'single') {
      const b = block as unknown as {
        correctIndex: number
        explanation?: string
      }
      explanation = b.explanation
      correctIndices = [b.correctIndex]
      isCorrect =
        body.selectedIndices.length === 1 && body.selectedIndices[0] === b.correctIndex
    } else {
      const b = block as unknown as {
        correctIndices: number[]
        explanation?: string
      }
      explanation = b.explanation
      correctIndices = b.correctIndices
      const want = new Set(b.correctIndices)
      const got = new Set(body.selectedIndices)
      isCorrect = want.size === got.size && [...want].every((x) => got.has(x))
    }

    await supabaseAdmin.from('lesson_quiz_attempts').insert({
      user_id: userId,
      lesson_id: lessonId,
      step_index: body.stepIndex,
      block_index: body.blockIndex,
      selected_indices: body.selectedIndices,
      is_correct: isCorrect,
    })

    res.json({
      correct: isCorrect,
      explanation: explanation ?? null,
      correctIndices,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * Stores one student-selected file and returns a URL that can be attached to a work submission.
 */
export async function uploadLessonSubmissionFile(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    const lessonId = Number(req.params.id)
    await getVisibleLessonOrThrow(lessonId)
    const body = submissionFileSchema.parse(req.body)
    const fileBuffer = Buffer.from(body.dataBase64, 'base64')
    if (fileBuffer.length !== body.size) {
      throw new AppError(400, 'Uploaded file payload is invalid. Please choose the file again.')
    }

    const attachmentUrl = await uploadSubmissionFile({
      userId,
      lessonId,
      fileName: body.fileName,
      contentType: body.contentType,
      data: fileBuffer,
    })

    res.status(201).json({ attachmentUrl })
  } catch (err) {
    next(err)
  }
}

/**
 * Saves optional homework text + attachment URL for a lesson (latest row wins for display).
 */
export async function submitLessonSubmission(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    const lessonId = Number(req.params.id)
    const body = submissionBodySchema.parse(req.body)
    await getVisibleLessonOrThrow(lessonId)

    const { data, error } = await supabaseAdmin
      .from('lesson_submissions')
      .insert({
        user_id: userId,
        lesson_id: lessonId,
        message: body.message?.trim() || null,
        attachment_url: body.attachmentUrl ?? null,
        status: 'submitted',
        updated_at: new Date().toISOString(),
      })
      .select('id, created_at')
      .single()

    if (error) throw new AppError(500, error.message)
    res.status(201).json(data)
  } catch (err) {
    next(err)
  }
}

/**
 * Lists all submissions created by the current learner, including staff grade and feedback.
 */
export async function listMyLessonSubmissions(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest

    const { data, error } = await supabaseAdmin
      .from('lesson_submissions')
      .select(
        'id, lesson_id, message, attachment_url, status, admin_feedback, grade, created_at, updated_at, lessons(title, label, modules(title, skills(title)))'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw new AppError(500, error.message)

    const items = (data ?? []).map((row: Record<string, unknown>) => {
      const lesson = row.lessons as
        | {
            title?: string | null
            label?: string | null
            modules?: { title?: string | null; skills?: { title?: string | null } | null } | null
          }
        | null
      return {
        id: row.id,
        lesson_id: row.lesson_id,
        lesson_title: lesson?.title ?? '',
        lesson_label: lesson?.label ?? '',
        module_title: lesson?.modules?.title ?? '',
        course_title: lesson?.modules?.skills?.title ?? '',
        message: row.message,
        attachment_url: row.attachment_url,
        status: row.status,
        admin_feedback: row.admin_feedback,
        grade: row.grade,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }
    })

    res.json({ items })
  } catch (err) {
    next(err)
  }
}

/**
 * Returns the learner's most recent submission for this lesson (feedback visibility).
 */
export async function getMyLessonSubmission(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    const lessonId = Number(req.params.id)
    await getVisibleLessonOrThrow(lessonId)

    const { data, error } = await supabaseAdmin
      .from('lesson_submissions')
      .select('id, message, attachment_url, status, admin_feedback, grade, created_at')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new AppError(500, error.message)
    res.json(data ?? null)
  } catch (err) {
    next(err)
  }
}
