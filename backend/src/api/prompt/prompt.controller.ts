import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import type { AuthenticatedRequest } from '../../types/index.js'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'

const createMineSchema = z.object({
  title: z.string().min(1).max(300),
  category: z.string().min(1).max(120),
  content: z.string().min(1).max(100_000),
})

const updateMineSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  category: z.string().min(1).max(120).optional(),
  content: z.string().min(1).max(100_000).optional(),
})

export async function listPrompts(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { search, category } = req.query

    let query = supabaseAdmin
      .from('prompts')
      .select('*')
      .order('order', { ascending: true })

    if (category && typeof category === 'string') {
      query = query.eq('category', category)
    }

    if (search && typeof search === 'string' && search.trim()) {
      query = query.ilike('title', `%${search.trim()}%`)
    }

    const { data, error } = await query

    if (error) throw new AppError(500, error.message)

    res.json(data ?? [])
  } catch (err) {
    next(err)
  }
}

export async function listCategories(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { data, error } = await supabaseAdmin
      .from('prompts')
      .select('category')

    if (error) throw new AppError(500, error.message)

    const categories = [...new Set((data ?? []).map((p) => p.category))].sort()
    res.json(categories)
  } catch (err) {
    next(err)
  }
}

/**
 * Lists the current user’s saved prompts; optional `search` and `category` query match curated list behavior.
 */
export async function listMyPrompts(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    const { search, category } = req.query

    let query = supabaseAdmin
      .from('user_prompts')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .order('updated_at', { ascending: false })

    if (category && typeof category === 'string' && category.trim()) {
      query = query.eq('category', category.trim())
    }

    if (search && typeof search === 'string' && search.trim()) {
      query = query.ilike('title', `%${search.trim()}%`)
    }

    const { data, error } = await query
    if (error) throw new AppError(500, error.message)
    res.json(data ?? [])
  } catch (err) {
    next(err)
  }
}

/**
 * Distinct category labels for the current user’s library (for filter chips).
 */
export async function listMyCategories(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    const { data, error } = await supabaseAdmin
      .from('user_prompts')
      .select('category')
      .eq('user_id', userId)

    if (error) throw new AppError(500, error.message)
    const categories = [...new Set((data ?? []).map((p) => p.category))].sort()
    res.json(categories)
  } catch (err) {
    next(err)
  }
}

/**
 * Creates a row in `user_prompts` for the authenticated user.
 */
export async function createMyPrompt(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    const body = createMineSchema.parse(req.body)

    const { data, error } = await supabaseAdmin
      .from('user_prompts')
      .insert({
        user_id: userId,
        title: body.title.trim(),
        category: body.category.trim(),
        content: body.content,
      })
      .select()
      .single()

    if (error) throw new AppError(500, error.message)
    res.status(201).json(data)
  } catch (err) {
    next(err)
  }
}

/**
 * Updates one of the user’s prompts (must own the row).
 */
export async function updateMyPrompt(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    const id = z.string().uuid().parse(req.params.id)
    const body = updateMineSchema.parse(req.body)

    if (Object.keys(body).length === 0) {
      throw new AppError(400, 'No fields to update')
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (body.title !== undefined) patch.title = body.title.trim()
    if (body.category !== undefined) patch.category = body.category.trim()
    if (body.content !== undefined) patch.content = body.content

    const { data, error } = await supabaseAdmin
      .from('user_prompts')
      .update(patch)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw new AppError(500, error.message)
    if (!data) throw new AppError(404, 'Prompt not found')
    res.json(data)
  } catch (err) {
    next(err)
  }
}

/**
 * Deletes a user-owned prompt.
 */
export async function deleteMyPrompt(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    const id = z.string().uuid().parse(req.params.id)

    const { data, error } = await supabaseAdmin
      .from('user_prompts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle()

    if (error) throw new AppError(500, error.message)
    if (!data) throw new AppError(404, 'Prompt not found')
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}
