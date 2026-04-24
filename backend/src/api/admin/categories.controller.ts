import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'

const createSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9_]+$/, 'slug must be lowercase letters, numbers, or underscore'),
  label: z.string().min(2).max(60),
  order: z.coerce.number().int().min(0).default(0),
})

const updateSchema = createSchema.partial().omit({ slug: true })

export async function listCategories(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('order', { ascending: true })
    if (error) throw new AppError(500, error.message)

    // Count skills per category
    const { data: skills, error: sErr } = await supabaseAdmin
      .from('skills')
      .select('category')
    if (sErr) throw new AppError(500, sErr.message)
    const counts = new Map<string, number>()
    for (const s of skills ?? []) {
      counts.set(s.category, (counts.get(s.category) ?? 0) + 1)
    }

    const rows = (data ?? []).map((c) => ({
      ...c,
      skill_count: counts.get(c.slug) ?? 0,
    }))

    res.json(rows)
  } catch (err) {
    next(err)
  }
}

export async function createCategory(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = createSchema.parse(req.body)
    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert(body)
      .select('*')
      .single()
    if (error) {
      if (error.code === '23505') {
        throw new AppError(409, `Category with slug "${body.slug}" already exists`)
      }
      throw new AppError(500, error.message)
    }
    res.status(201).json(data)
  } catch (err) {
    next(err)
  }
}

export async function updateCategory(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw new AppError(400, 'Invalid id')
    const body = updateSchema.parse(req.body)
    const { data, error } = await supabaseAdmin
      .from('categories')
      .update(body)
      .eq('id', id)
      .select('*')
      .maybeSingle()
    if (error) throw new AppError(500, error.message)
    if (!data) throw new AppError(404, 'Category not found')
    res.json(data)
  } catch (err) {
    next(err)
  }
}

export async function deleteCategory(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw new AppError(400, 'Invalid id')

    // Guard: refuse delete if any skills still reference this category.
    const { data: cat, error: catErr } = await supabaseAdmin
      .from('categories')
      .select('slug')
      .eq('id', id)
      .maybeSingle()
    if (catErr) throw new AppError(500, catErr.message)
    if (!cat) throw new AppError(404, 'Category not found')

    const { count, error: cErr } = await supabaseAdmin
      .from('skills')
      .select('*', { count: 'exact', head: true })
      .eq('category', cat.slug)
    if (cErr) throw new AppError(500, cErr.message)
    if ((count ?? 0) > 0) {
      throw new AppError(409, `Category still has ${count} course(s). Move or delete them first.`)
    }

    const { error } = await supabaseAdmin.from('categories').delete().eq('id', id)
    if (error) throw new AppError(500, error.message)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}
