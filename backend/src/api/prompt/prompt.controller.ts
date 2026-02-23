import type { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'

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
