import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'
import { augmentPostgrestFailure } from '../../utils/postgrest-error.js'

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

/** DB row after migration 003 (column sort_order; API still exposes `order`). */
interface CategoryRow {
  id: number
  slug: string
  label: string
  sort_order: number
  created_at: string
}

/**
 * Maps a categories table row to the JSON shape expected by the admin SPA (`order`, not `sort_order`).
 */
function toCategoryApi(row: CategoryRow, skill_count?: number) {
  const base = {
    id: row.id,
    slug: row.slug,
    label: row.label,
    order: row.sort_order,
    created_at: row.created_at,
  }
  return skill_count !== undefined ? { ...base, skill_count } : base
}

export async function listCategories(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('id, slug, label, sort_order, created_at')
      .order('sort_order', { ascending: true })
    if (error) throw new AppError(500, augmentPostgrestFailure(error))

    // Count skills per category
    const { data: skills, error: sErr } = await supabaseAdmin
      .from('skills')
      .select('category')
    if (sErr) throw new AppError(500, augmentPostgrestFailure(sErr))
    const counts = new Map<string, number>()
    for (const s of skills ?? []) {
      counts.set(s.category, (counts.get(s.category) ?? 0) + 1)
    }

    const rows = (data ?? []).map((c) =>
      toCategoryApi(c as CategoryRow, counts.get(c.slug) ?? 0)
    )

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
      .insert({ slug: body.slug, label: body.label, sort_order: body.order })
      .select('id, slug, label, sort_order, created_at')
      .single()
    if (error) {
      if (error.code === '23505') {
        throw new AppError(409, `Category with slug "${body.slug}" already exists`)
      }
      throw new AppError(500, augmentPostgrestFailure(error))
    }
    if (!data) throw new AppError(500, 'Insert returned no row')
    res.status(201).json(toCategoryApi(data as CategoryRow))
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
    const patch: { label?: string; sort_order?: number } = {}
    if (body.label !== undefined) patch.label = body.label
    if (body.order !== undefined) patch.sort_order = body.order

    const { data, error } = await supabaseAdmin
      .from('categories')
      .update(patch)
      .eq('id', id)
      .select('id, slug, label, sort_order, created_at')
      .maybeSingle()
    if (error) throw new AppError(500, augmentPostgrestFailure(error))
    if (!data) throw new AppError(404, 'Category not found')
    res.json(toCategoryApi(data as CategoryRow))
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
    if (catErr) throw new AppError(500, augmentPostgrestFailure(catErr))
    if (!cat) throw new AppError(404, 'Category not found')

    const { count, error: cErr } = await supabaseAdmin
      .from('skills')
      .select('*', { count: 'exact', head: true })
      .eq('category', cat.slug)
    if (cErr) throw new AppError(500, augmentPostgrestFailure(cErr))
    if ((count ?? 0) > 0) {
      throw new AppError(409, `Category still has ${count} course(s). Move or delete them first.`)
    }

    const { error } = await supabaseAdmin.from('categories').delete().eq('id', id)
    if (error) throw new AppError(500, augmentPostgrestFailure(error))
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}
