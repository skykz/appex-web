import type { Request, Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from '../../types/index.js'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'
import { getFreeSkillId, hasAccess } from '../../services/access.service.js'

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

    // Paywall annotation: every skill except the first one is Premium.
    // We compute it once per request rather than per-row to avoid a chatty DB.
    const [freeSkillId, userHasAccess] = await Promise.all([
      getFreeSkillId(),
      hasAccess(userId),
    ])

    const result = (skills ?? []).map((skill) => {
      const p = progressMap.get(skill.id)
      const requiresPremium = freeSkillId !== null && skill.id !== freeSkillId
      return {
        ...skill,
        progress: p?.progress ?? 0,
        status: p?.status ?? 'not_started',
        requires_premium: requiresPremium,
        // The frontend uses this to decide whether to grey out the card and
        // show a paywall modal instead of routing into the skill.
        premium_locked: requiresPremium && !userHasAccess,
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

    // Two independent gates feed into `locked`:
    //   - `sequence`: previous lesson not finished (the existing rule)
    //   - `premium`:  this skill is paid and the user has no active subscription
    // `locked_reason` lets the UI render a Premium badge instead of a generic
    // padlock when payment is the blocker.
    const [freeSkillId, userHasAccess] = await Promise.all([
      getFreeSkillId(),
      hasAccess(userId),
    ])
    const requiresPremium = freeSkillId !== null && skill.id !== freeSkillId
    const premiumLocked = requiresPremium && !userHasAccess

    let previousCompleted = true
    const modulesWithLessons = (modules ?? []).map((mod) => {
      const modLessons = (lessons ?? [])
        .filter((l) => l.module_id === mod.id)
        .sort((a, b) => a.order - b.order)

      const lessonsWithLock = modLessons.map((lesson) => {
        const completed = completedSet.has(lesson.id)
        const sequenceLocked = !previousCompleted
        const locked = sequenceLocked || premiumLocked
        const locked_reason: 'premium' | 'sequence' | null = premiumLocked
          ? 'premium'
          : sequenceLocked
          ? 'sequence'
          : null
        previousCompleted = completed
        return {
          id: lesson.id,
          label: lesson.label,
          title: lesson.title,
          emoji: lesson.emoji,
          locked,
          locked_reason,
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
      requires_premium: requiresPremium,
      premium_locked: premiumLocked,
      modules: modulesWithLessons,
    })
  } catch (err) {
    next(err)
  }
}
