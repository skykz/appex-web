import type { Request, Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from '../types/index.js'
import { supabase, supabaseAdmin } from '../db/supabase.js'
import { AppError } from '../utils/error-handler.js'

async function ensureUserProfile(user: {
  id: string
  email?: string
  user_metadata?: Record<string, unknown>
}) {
  if (!user.email) return

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (error) throw new AppError(500, error.message)
  if (data) return

  const metadataName = user.user_metadata?.name
  const fallbackName = user.email.split('@')[0] || 'AppEx learner'
  const name =
    typeof metadataName === 'string' && metadataName.trim().length >= 2
      ? metadataName.trim()
      : fallbackName.length >= 2
        ? fallbackName
        : 'AppEx learner'

  const { error: insertError } = await supabaseAdmin.from('users').insert({
    id: user.id,
    email: user.email,
    name,
  })

  if (insertError && insertError.code !== '23505') {
    throw new AppError(500, insertError.message)
  }
}

export async function requireAuth(
  req: Request,
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

    await ensureUserProfile(data.user)

    ;(req as AuthenticatedRequest).userId = data.user.id
    ;(req as AuthenticatedRequest).userEmail = data.user.email ?? ''
    next()
  } catch (err) {
    next(err)
  }
}
