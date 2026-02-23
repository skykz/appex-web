import type { Request, Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from '../../types/index.js'
import { z } from 'zod'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'

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
      steps: lesson.content,
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
