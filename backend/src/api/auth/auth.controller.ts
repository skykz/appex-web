import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase, supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const signupSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

/** Fetch the app user record (with `name`) from the users table. */
async function fetchAppUser(userId: string) {
  const { data } = await supabaseAdmin
    .from('users')
    .select('id, email, name, created_at')
    .eq('id', userId)
    .single()
  return data
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const body = loginSchema.parse(req.body)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    })

    if (error) throw new AppError(401, error.message)

    const user = await fetchAppUser(data.user.id)

    res.json({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: user ?? { id: data.user.id, email: data.user.email },
    })
  } catch (err) {
    next(err)
  }
}

export async function signup(req: Request, res: Response, next: NextFunction) {
  try {
    const body = signupSchema.parse(req.body)

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
      })

    if (authError) throw new AppError(400, authError.message)

    // Create user record
    await supabaseAdmin.from('users').insert({
      id: authData.user.id,
      email: body.email,
      name: body.name,
    })

    // Initialize user credits and streak
    await supabaseAdmin
      .from('user_credits')
      .insert({ user_id: authData.user.id, balance: 5 })

    await supabaseAdmin
      .from('streaks')
      .insert({ user_id: authData.user.id })

    // Sign in to get tokens
    const { data: session, error: sessionError } =
      await supabase.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      })

    if (sessionError) throw new AppError(500, sessionError.message)

    const user = await fetchAppUser(authData.user.id)

    res.status(201).json({
      accessToken: session.session.access_token,
      refreshToken: session.session.refresh_token,
      user: user ?? { id: authData.user.id, email: body.email, name: body.name },
    })
  } catch (err) {
    next(err)
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const body = refreshSchema.parse(req.body)

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: body.refreshToken,
    })

    if (error || !data.session || !data.user)
      throw new AppError(401, 'Invalid refresh token')

    const user = await fetchAppUser(data.user.id)

    res.json({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: user ?? { id: data.user.id, email: data.user.email },
    })
  } catch (err) {
    next(err)
  }
}
