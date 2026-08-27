import type { Request, Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from '../../types/index.js'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'
import { getFreeSkillId, hasAccess } from '../../services/access.service.js'
import { getCertificate, mintCertificate } from '../../services/certificate.service.js'
import { dashboardLog } from '../../lib/logger.js'

/** Lists the visible course categories used by the learner catalog. */
export async function listSkillCategories(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('slug, label, sort_order')
      .eq('is_visible', true)
      .order('sort_order', { ascending: true })
    if (error) throw new AppError(500, error.message)
    res.json(data ?? [])
  } catch (err) {
    next(err)
  }
}

export async function listSkills(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    const { category } = req.query
    const { data: visibleCategories, error: categoryError } = await supabaseAdmin
      .from('categories')
      .select('slug')
      .eq('is_visible', true)
    if (categoryError) throw new AppError(500, categoryError.message)

    const visibleCategorySlugs = (visibleCategories ?? []).map((c) => c.slug)
    if (visibleCategorySlugs.length === 0) {
      res.json([])
      return
    }

    let query = supabaseAdmin
      .from('skills')
      .select('*')
      .eq('is_visible', true)
      .in('category', visibleCategorySlugs)
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

    // Home dashboard load. `lockedCount` vs `hasAccess` is the retention signal:
    // a paying user seeing locked cards means entitlement sync broke.
    dashboardLog.info('dashboard.skills_listed', {
      reqId: req.reqId,
      userId,
      total: result.length,
      inProgress: result.filter((s) => s.status === 'in_progress').length,
      completed: result.filter((s) => s.status === 'completed').length,
      lockedCount: result.filter((s) => s.premium_locked).length,
      hasAccess: userHasAccess,
      category: (category as string) ?? null,
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
      .eq('is_visible', true)
      .single()

    if (skillError || !skill) throw new AppError(404, 'Skill not found')

    const { data: categoryRow, error: categoryError } = await supabaseAdmin
      .from('categories')
      .select('slug')
      .eq('slug', skill.category)
      .eq('is_visible', true)
      .maybeSingle()
    if (categoryError) throw new AppError(500, categoryError.message)
    if (!categoryRow) throw new AppError(404, 'Skill not found')

    // Fetch modules with lessons
    const { data: modules } = await supabaseAdmin
      .from('modules')
      .select('*')
      .eq('skill_id', skillId)
      .eq('is_visible', true)
      .order('order', { ascending: true })

    const moduleIds = (modules ?? []).map((m) => m.id)

    const { data: lessons } = await supabaseAdmin
      .from('lessons')
      .select('id, module_id, label, title, emoji, "order"')
      .eq('is_visible', true)
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

    // Surface the earned certificate so the UI can show the real credential
    // code + issue date. If the course is complete but no certificate exists
    // yet (legacy completion, or a missed mint), back-fill it on read so the
    // credential is always available once a course is done.
    let certificate = null
    if (progress?.status === 'completed') {
      certificate =
        (await getCertificate(userId, skillId)) ??
        (await mintCertificate(userId, skillId))
    }

    res.json({
      ...skill,
      progress: progress?.progress ?? 0,
      status: progress?.status ?? 'not_started',
      requires_premium: requiresPremium,
      premium_locked: premiumLocked,
      modules: modulesWithLessons,
      certificate,
    })
  } catch (err) {
    next(err)
  }
}
