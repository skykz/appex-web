import type { Request, Response, NextFunction } from 'express'
import {
  lessonCreateSchema,
  lessonEmoji,
  lessonUpdateSchema,
  migrateLegacyQuizShapes,
} from '@appex/lesson-schema'
import { z } from 'zod'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'
import {
  assertCanDeleteCourse,
  assertCanDeleteLesson,
  assertCanDeleteModule,
} from './content-deletion-policy.js'

const certTagsSchema = z.array(z.string().min(1).max(40)).max(8)

const courseCreateSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().min(2).max(300),
  about: z.string().min(2),
  emoji: lessonEmoji,
  category: z.string().min(1),
  duration: z.string().min(1),
  is_visible: z.boolean().default(false),
  order: z.coerce.number().int().min(0).optional(),
  /** Display title on the completion certificate (newline = line break). */
  cert_title: z.string().max(200).nullable().optional(),
  /** Description printed on the certificate (newline = line break). */
  cert_description: z.string().max(600).nullable().optional(),
  /** Skill tags shown as pills on the certificate. */
  cert_tags: certTagsSchema.optional(),
})

const courseUpdateSchema = courseCreateSchema.partial()

const moduleCreateSchema = z.object({
  title: z.string().min(2).max(120),
  is_visible: z.boolean().default(false),
})

const moduleUpdateSchema = z.object({
  title: z.string().min(2).max(120).optional(),
  is_visible: z.boolean().optional(),
  order: z.coerce.number().int().min(0).optional(),
})

const reorderIdsSchema = z.object({
  orderedIds: z.array(z.number().int()).min(1),
})

async function ensureCategoryExists(slug: string) {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw new AppError(500, error.message)
  if (!data) throw new AppError(400, `Unknown category "${slug}". Create it first.`)
}

function intParam(name: string, value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value
  const n = Number(raw)
  if (!Number.isFinite(n)) throw new AppError(400, `Invalid ${name}`)
  return n
}

/** Reads the explicit force flag used for irreversible admin deletes. */
function isForceDelete(req: Request): boolean {
  return req.query.force === 'true' || req.query.force === '1'
}

// ---------- Courses (skills) ----------

export async function listCourses(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { data: skills, error } = await supabaseAdmin
      .from('skills')
      .select('*')
      .order('order', { ascending: true })
    if (error) throw new AppError(500, error.message)

    const skillIds = (skills ?? []).map((s) => s.id)

    // module counts
    const { data: modules } = await supabaseAdmin
      .from('modules')
      .select('id, skill_id')
      .in('skill_id', skillIds.length ? skillIds : [-1])
    const moduleCount = new Map<number, number>()
    const moduleToSkill = new Map<number, number>()
    for (const m of modules ?? []) {
      moduleCount.set(m.skill_id, (moduleCount.get(m.skill_id) ?? 0) + 1)
      moduleToSkill.set(m.id, m.skill_id)
    }

    // lesson counts
    const moduleIds = [...moduleToSkill.keys()]
    const { data: lessons } = await supabaseAdmin
      .from('lessons')
      .select('id, module_id')
      .in('module_id', moduleIds.length ? moduleIds : [-1])
    const lessonCount = new Map<number, number>()
    for (const l of lessons ?? []) {
      const sid = moduleToSkill.get(l.module_id)
      if (sid != null) {
        lessonCount.set(sid, (lessonCount.get(sid) ?? 0) + 1)
      }
    }

    res.json(
      (skills ?? []).map((s) => ({
        ...s,
        module_count: moduleCount.get(s.id) ?? 0,
        lesson_count: lessonCount.get(s.id) ?? 0,
      }))
    )
  } catch (err) {
    next(err)
  }
}

export async function getCourseDetail(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = intParam('id', req.params.id)

    const { data: skill, error } = await supabaseAdmin
      .from('skills')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new AppError(500, error.message)
    if (!skill) throw new AppError(404, 'Course not found')

    const { data: modules } = await supabaseAdmin
      .from('modules')
      .select('*')
      .eq('skill_id', id)
      .order('order', { ascending: true })

    const moduleIds = (modules ?? []).map((m) => m.id)
    const { data: lessons } = await supabaseAdmin
      .from('lessons')
      .select('*')
      .in('module_id', moduleIds.length ? moduleIds : [-1])
      .order('order', { ascending: true })

    const modulesWithLessons = (modules ?? []).map((m) => ({
      ...m,
      lessons: (lessons ?? []).filter((l) => l.module_id === m.id),
    }))

    res.json({ ...skill, modules: modulesWithLessons })
  } catch (err) {
    next(err)
  }
}

export async function createCourse(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = courseCreateSchema.parse(req.body)
    await ensureCategoryExists(body.category)

    const { data: maxSkill } = await supabaseAdmin
      .from('skills')
      .select('order')
      .order('order', { ascending: false })
      .limit(1)
      .maybeSingle()
    const nextOrder = (maxSkill?.order != null ? Number(maxSkill.order) : -1) + 1

    const { data, error } = await supabaseAdmin
      .from('skills')
      .insert({ ...body, order: nextOrder })
      .select('*')
      .single()
    if (error) throw new AppError(500, error.message)
    res.status(201).json(data)
  } catch (err) {
    next(err)
  }
}

export async function updateCourse(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = intParam('id', req.params.id)
    const body = courseUpdateSchema.parse(req.body)
    if (body.category) await ensureCategoryExists(body.category)

    const { data: existingCourse, error: existingCourseError } = await supabaseAdmin
      .from('skills')
      .select('is_visible')
      .eq('id', id)
      .maybeSingle()
    if (existingCourseError) throw new AppError(500, existingCourseError.message)
    if (!existingCourse) throw new AppError(404, 'Course not found')

    const { data, error } = await supabaseAdmin
      .from('skills')
      .update(body)
      .eq('id', id)
      .select('*')
      .maybeSingle()
    if (error) throw new AppError(500, error.message)
    if (!data) throw new AppError(404, 'Course not found')

    if (body.is_visible === true && !existingCourse.is_visible) {
      const { data: modules, error: modulesError } = await supabaseAdmin
        .from('modules')
        .update({ is_visible: true })
        .eq('skill_id', id)
        .select('id')
      if (modulesError) throw new AppError(500, modulesError.message)

      const moduleIds = (modules ?? []).map((module) => module.id)
      if (moduleIds.length > 0) {
        const { error: lessonsError } = await supabaseAdmin
          .from('lessons')
          .update({ is_visible: true })
          .in('module_id', moduleIds)
        if (lessonsError) throw new AppError(500, lessonsError.message)
      }
    }

    res.json(data)
  } catch (err) {
    next(err)
  }
}

export async function deleteCourse(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = intParam('id', req.params.id)
    if (!isForceDelete(req)) await assertCanDeleteCourse(id)
    const { error } = await supabaseAdmin.from('skills').delete().eq('id', id)
    if (error) throw new AppError(500, error.message)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}

// ---------- Modules ----------

export async function createModule(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const skillId = intParam('courseId', req.params.courseId)
    const body = moduleCreateSchema.parse(req.body)

    // Validate parent exists
    const { data: skill, error: sErr } = await supabaseAdmin
      .from('skills')
      .select('id')
      .eq('id', skillId)
      .maybeSingle()
    if (sErr) throw new AppError(500, sErr.message)
    if (!skill) throw new AppError(404, 'Course not found')

    const { data: maxMod } = await supabaseAdmin
      .from('modules')
      .select('order')
      .eq('skill_id', skillId)
      .order('order', { ascending: false })
      .limit(1)
      .maybeSingle()
    const nextOrder = (maxMod?.order != null ? Number(maxMod.order) : -1) + 1

    const { data, error } = await supabaseAdmin
      .from('modules')
      .insert({
        title: body.title,
        is_visible: body.is_visible,
        skill_id: skillId,
        order: nextOrder,
      })
      .select('*')
      .single()
    if (error) throw new AppError(500, error.message)
    res.status(201).json(data)
  } catch (err) {
    next(err)
  }
}

export async function updateModule(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = intParam('id', req.params.id)
    const body = moduleUpdateSchema.parse(req.body)

    const { data: existingModule, error: existingModuleError } = await supabaseAdmin
      .from('modules')
      .select('is_visible')
      .eq('id', id)
      .maybeSingle()
    if (existingModuleError) throw new AppError(500, existingModuleError.message)
    if (!existingModule) throw new AppError(404, 'Module not found')

    const { data, error } = await supabaseAdmin
      .from('modules')
      .update(body)
      .eq('id', id)
      .select('*')
      .maybeSingle()
    if (error) throw new AppError(500, error.message)
    if (!data) throw new AppError(404, 'Module not found')

    if (body.is_visible === true && !existingModule.is_visible) {
      const { error: lessonsError } = await supabaseAdmin
        .from('lessons')
        .update({ is_visible: true })
        .eq('module_id', id)
      if (lessonsError) throw new AppError(500, lessonsError.message)
    }

    res.json(data)
  } catch (err) {
    next(err)
  }
}

export async function deleteModule(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = intParam('id', req.params.id)
    if (!isForceDelete(req)) await assertCanDeleteModule(id)
    const { error } = await supabaseAdmin.from('modules').delete().eq('id', id)
    if (error) throw new AppError(500, error.message)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}

// ---------- Lessons ----------

export async function createLesson(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const moduleId = intParam('moduleId', req.params.moduleId)
    const body = lessonCreateSchema.parse({
      ...req.body,
      content: migrateLegacyQuizShapes(req.body?.content),
    })

    const { data: mod, error: mErr } = await supabaseAdmin
      .from('modules')
      .select('id')
      .eq('id', moduleId)
      .maybeSingle()
    if (mErr) throw new AppError(500, mErr.message)
    if (!mod) throw new AppError(404, 'Module not found')

    const { data: maxLes } = await supabaseAdmin
      .from('lessons')
      .select('order')
      .eq('module_id', moduleId)
      .order('order', { ascending: false })
      .limit(1)
      .maybeSingle()
    const nextOrder = (maxLes?.order != null ? Number(maxLes.order) : -1) + 1

    const { data, error } = await supabaseAdmin
      .from('lessons')
      .insert({ ...body, module_id: moduleId, order: nextOrder })
      .select('*')
      .single()
    if (error) throw new AppError(500, error.message)
    res.status(201).json(data)
  } catch (err) {
    next(err)
  }
}

export async function updateLesson(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = intParam('id', req.params.id)
    const raw = { ...req.body }
    if (raw.content != null) raw.content = migrateLegacyQuizShapes(raw.content)
    const body = lessonUpdateSchema.parse(raw)
    const { data, error } = await supabaseAdmin
      .from('lessons')
      .update(body)
      .eq('id', id)
      .select('*')
      .maybeSingle()
    if (error) throw new AppError(500, error.message)
    if (!data) throw new AppError(404, 'Lesson not found')
    res.json(data)
  } catch (err) {
    next(err)
  }
}

export async function deleteLesson(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = intParam('id', req.params.id)
    if (!isForceDelete(req)) await assertCanDeleteLesson(id)
    const { error } = await supabaseAdmin.from('lessons').delete().eq('id', id)
    if (error) throw new AppError(500, error.message)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}

// ---------- Reorder (dense order indices via RPC) ----------

/**
 * Sets `skills.order` from a full permutation of course ids (single DB transaction).
 */
export async function reorderCourses(req: Request, res: Response, next: NextFunction) {
  try {
    const { orderedIds } = reorderIdsSchema.parse(req.body)
    const { error } = await supabaseAdmin.rpc('admin_reorder_courses', {
      p_course_ids: orderedIds,
    })
    if (error) throw new AppError(400, error.message)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}

/**
 * Sets `modules.order` for one course from a full list of that course’s module ids.
 */
export async function reorderCourseModules(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const courseId = intParam('courseId', req.params.courseId)
    const { orderedIds } = reorderIdsSchema.parse(req.body)
    const { error } = await supabaseAdmin.rpc('admin_reorder_modules', {
      p_skill_id: courseId,
      p_module_ids: orderedIds,
    })
    if (error) throw new AppError(400, error.message)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}

/**
 * Sets `lessons.order` for one module from a full list of that module’s lesson ids.
 */
export async function reorderModuleLessons(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const moduleId = intParam('moduleId', req.params.moduleId)
    const { orderedIds } = reorderIdsSchema.parse(req.body)
    const { error } = await supabaseAdmin.rpc('admin_reorder_lessons', {
      p_module_id: moduleId,
      p_lesson_ids: orderedIds,
    })
    if (error) throw new AppError(400, error.message)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}
