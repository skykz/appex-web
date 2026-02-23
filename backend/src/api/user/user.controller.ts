import type { Request, Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from '../../types/index.js'
import { z } from 'zod'
import { supabase, supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
})

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

export async function createUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = createUserSchema.parse(req.body)

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
      })

    if (authError) throw new AppError(400, authError.message)

    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email: body.email,
        name: body.name,
      })
      .select()
      .single()

    if (error) throw new AppError(500, error.message)

    res.status(201).json(data)
  } catch (err) {
    next(err)
  }
}

export async function getCurrentUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !data) throw new AppError(404, 'User not found')

    res.json(data)
  } catch (err) {
    next(err)
  }
}

export async function getUserById(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, created_at')
      .eq('id', req.params.id)
      .single()

    if (error || !data) throw new AppError(404, 'User not found')

    res.json(data)
  } catch (err) {
    next(err)
  }
}

export async function updateCurrentUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    const body = updateUserSchema.parse(req.body)

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw new AppError(500, error.message)

    res.json(data)
  } catch (err) {
    next(err)
  }
}

export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userEmail } = req as AuthenticatedRequest
    const body = changePasswordSchema.parse(req.body)

    // Verify current password by attempting sign-in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: body.currentPassword,
    })

    if (verifyError) throw new AppError(400, 'Current password is incorrect')

    // Update password via admin API
    const { userId } = req as AuthenticatedRequest
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: body.newPassword,
    })

    if (error) throw new AppError(500, error.message)

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}
