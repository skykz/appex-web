import type { Request, Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from '../../types/index.js'
import { z } from 'zod'
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

export async function getLesson(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    const lessonId = Number(req.params.id)

    const { data: lesson, error } = await supabaseAdmin
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single()

    if (error || !lesson) throw new AppError(404, 'Lesson not found')

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

    // Recalculate skill progress
    // Find skill via lesson → module → skill
    const { data: lesson } = await supabaseAdmin
      .from('lessons')
      .select('module_id')
      .eq('id', lessonId)
      .single()

    if (lesson) {
      const { data: mod } = await supabaseAdmin
        .from('modules')
        .select('skill_id')
        .eq('id', lesson.module_id)
        .single()

      if (mod) {
        await recalculateSkillProgress(userId, mod.skill_id)
      }
    }

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

  const moduleIds = (modules ?? []).map((m) => m.id)
  if (moduleIds.length === 0) return

  const { data: lessons } = await supabaseAdmin
    .from('lessons')
    .select('id')
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

const submissionBodySchema = z.object({
  message: z.string().min(1).max(8000),
  attachmentUrl: z.string().url().or(z.string().startsWith('/')).optional(),
})

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

    const { data: lesson, error } = await supabaseAdmin
      .from('lessons')
      .select('content')
      .eq('id', lessonId)
      .single()
    if (error || !lesson) throw new AppError(404, 'Lesson not found')

    const steps = lesson.content as Array<{ blocks?: unknown[] }>
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
      isCorrect =
        body.selectedIndices.length === 1 && body.selectedIndices[0] === b.correctIndex
    } else {
      const b = block as unknown as {
        correctIndices: number[]
        explanation?: string
      }
      explanation = b.explanation
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
    })
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

    const { data: lesson, error: le } = await supabaseAdmin
      .from('lessons')
      .select('id')
      .eq('id', lessonId)
      .maybeSingle()
    if (le || !lesson) throw new AppError(404, 'Lesson not found')

    const { data, error } = await supabaseAdmin
      .from('lesson_submissions')
      .insert({
        user_id: userId,
        lesson_id: lessonId,
        message: body.message,
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

    const { data, error } = await supabaseAdmin
      .from('lesson_submissions')
      .select('id, message, attachment_url, status, admin_feedback, created_at')
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
