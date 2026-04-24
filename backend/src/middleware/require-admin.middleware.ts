import type { Request, Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from '../types/index.js'
import { supabaseAdmin } from '../db/supabase.js'
import { AppError } from '../utils/error-handler.js'

/**
 * Runs after requireAuth. Loads users.role and rejects non-admin accounts.
 * Use as the second middleware in admin routes: requireAuth → requireAdmin → handler.
 */
export async function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    if (!userId) {
      throw new AppError(401, 'Not authenticated')
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (error) throw new AppError(500, error.message)
    if (!data) throw new AppError(401, 'User not found')
    if (data.role !== 'admin') {
      throw new AppError(403, 'Admin access required')
    }

    next()
  } catch (err) {
    next(err)
  }
}
