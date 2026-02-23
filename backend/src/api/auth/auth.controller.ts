import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const body = loginSchema.parse(req.body)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    })

    if (error) throw new AppError(401, error.message)

    res.json({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: data.user,
    })
  } catch (err) {
    next(err)
  }
}
