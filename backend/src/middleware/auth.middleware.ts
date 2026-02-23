import type { Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from '../types/index.js'
import { supabase } from '../db/supabase.js'
import { AppError } from '../utils/error-handler.js'

export async function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'Missing or invalid authorization header')
    }

    const token = authHeader.slice(7)

    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data.user) {
      throw new AppError(401, 'Invalid or expired token')
    }

    req.userId = data.user.id
    req.userEmail = data.user.email ?? ''
    next()
  } catch (err) {
    next(err)
  }
}
