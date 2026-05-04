import type { Request, Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from '../../types/index.js'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'

export async function listSkills(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    const { category } = req.query

    let query = supabaseAdmin
      .from('skills')
      .select('*')
      .order('order', { ascending: true })

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    const { data: skills, error } = await query

    if (error) throw new AppError(500, error.message)

    // Fetch user progress for all skills
    const { data: progress } = await supabaseAdmin
      .from('skill_progress')
      .select('skill_id, progress, status')
      .eq('user_id', userId)

    const progressMap = new Map(
      (progress ?? []).map((p) => [p.skill_id, p])
    )

    const result = (skills ?? []).map((skill) => {
      const p = progressMap.get(skill.id)
      return {
        ...skill,
        progress: p?.progress ?? 0,
        status: p?.status ?? 'not_started',
      }
    })

    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function getSkillDetail(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    const skillId = Number(req.params.id)

    // Fetch skill
    const { data: skill, error: skillError } = await supabaseAdmin
      .from('skills')
      .select('*')
      .eq('id', skillId)
      .single()

    if (skillError || !skill) throw new AppError(404, 'Skill not found')

    // Fetch modules with lessons
    const { data: modules } = await supabaseAdmin
      .from('modules')
      .select('*')
      .eq('skill_id', skillId)
      .order('order', { ascending: true })

    const moduleIds = (modules ?? []).map((m) => m.id)

    const { data: lessons } = await supabaseAdmin
      .from('lessons')
      .select('id, module_id, label, title, emoji, "order"')
      .in('module_id', moduleIds.length > 0 ? moduleIds : [-1])
      .order('order', { ascending: true })

    // Fetch user lesson progress
    const lessonIds = (lessons ?? []).map((l) => l.id)
    const { data: lessonProgress } = await supabaseAdmin
      .from('lesson_progress')
      .select('lesson_id, completed')
      .eq('user_id', userId)
      .in('lesson_id', lessonIds.length > 0 ? lessonIds : [-1])

    const completedSet = new Set(
      (lessonProgress ?? [])
        .filter((lp) => lp.completed)
        .map((lp) => lp.lesson_id)
    )

    // Linear lock across the whole course: a lesson stays locked until every prior lesson is completed.
    let previousCompleted = true
    const modulesWithLessons = (modules ?? []).map((mod) => {
      const modLessons = (lessons ?? [])
        .filter((l) => l.module_id === mod.id)
        .sort((a, b) => a.order - b.order)

      const lessonsWithLock = modLessons.map((lesson) => {
        const completed = completedSet.has(lesson.id)
        const locked = !previousCompleted
        previousCompleted = completed
        return {
          id: lesson.id,
          label: lesson.label,
          title: lesson.title,
          emoji: lesson.emoji,
          locked,
          completed,
        }
      })

      return {
        id: mod.id,
        title: mod.title,
        lessonCount: modLessons.length,
        lessons: lessonsWithLock,
      }
    })

    // Fetch skill progress
    const { data: progress } = await supabaseAdmin
      .from('skill_progress')
      .select('progress, status')
      .eq('user_id', userId)
      .eq('skill_id', skillId)
      .maybeSingle()

    res.json({
      ...skill,
      progress: progress?.progress ?? 0,
      status: progress?.status ?? 'not_started',
      modules: modulesWithLessons,
    })
  } catch (err) {
    next(err)
  }
}
