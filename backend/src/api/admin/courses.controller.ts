import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'

// Lesson block schema — matches the renderer in the user frontend.
const lessonBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), content: z.string() }),
  z.object({ type: z.literal('bold-text'), content: z.string() }),
  z.object({ type: z.literal('heading'), content: z.string() }),
  z.object({ type: z.literal('image'), src: z.string().url().or(z.string().startsWith('/')), alt: z.string().optional() }),
  z.object({ type: z.literal('list'), items: z.array(z.string()).min(1) }),
  z.object({ type: z.literal('user-message'), name: z.string(), text: z.string() }),
  z.object({ type: z.literal('mentor-message'), text: z.string() }),
])

const lessonStepSchema = z.object({
  blocks: z.array(lessonBlockSchema).min(1),
})

const courseCreateSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().min(2).max(300),
  about: z.string().min(2),
  emoji: z.string().min(1).max(8),
  category: z.string().min(1),
  duration: z.string().min(1),
  order: z.coerce.number().int().min(0).default(0),
})

const courseUpdateSchema = courseCreateSchema.partial()

const moduleCreateSchema = z.object({
  title: z.string().min(2).max(120),
  order: z.coerce.number().int().min(0).default(0),
})

const moduleUpdateSchema = moduleCreateSchema.partial()

const lessonCreateSchema = z.object({
  label: z.string().min(1),
  title: z.string().min(1),
  emoji: z.string().min(1),
  content: z.array(lessonStepSchema).min(1),
  order: z.coerce.number().int().min(0).default(0),
})

const lessonUpdateSchema = lessonCreateSchema.partial()

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

    const { data, error } = await supabaseAdmin
      .from('skills')
      .insert(body)
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

    const { data, error } = await supabaseAdmin
      .from('skills')
      .update(body)
      .eq('id', id)
      .select('*')
      .maybeSingle()
    if (error) throw new AppError(500, error.message)
    if (!data) throw new AppError(404, 'Course not found')
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

    const { data, error } = await supabaseAdmin
      .from('modules')
      .insert({ ...body, skill_id: skillId })
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
    const { data, error } = await supabaseAdmin
      .from('modules')
      .update(body)
      .eq('id', id)
      .select('*')
      .maybeSingle()
    if (error) throw new AppError(500, error.message)
    if (!data) throw new AppError(404, 'Module not found')
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
    const body = lessonCreateSchema.parse(req.body)

    const { data: mod, error: mErr } = await supabaseAdmin
      .from('modules')
      .select('id')
      .eq('id', moduleId)
      .maybeSingle()
    if (mErr) throw new AppError(500, mErr.message)
    if (!mod) throw new AppError(404, 'Module not found')

    const { data, error } = await supabaseAdmin
      .from('lessons')
      .insert({ ...body, module_id: moduleId })
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
    const body = lessonUpdateSchema.parse(req.body)
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
    const { error } = await supabaseAdmin.from('lessons').delete().eq('id', id)
    if (error) throw new AppError(500, error.message)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}
