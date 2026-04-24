import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase, supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

/**
 * Admin login: signs in via Supabase, then verifies the user's role is 'admin'.
 * Rejects non-admin accounts with 403 so the admin UI never gets a token.
 */
export async function adminLogin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = loginSchema.parse(req.body)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    })

    if (error) throw new AppError(401, error.message)
    if (!data.session || !data.user) {
      throw new AppError(401, 'Sign-in did not return a session')
    }

    const { data: userRow, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role')
      .eq('id', data.user.id)
      .maybeSingle()

    if (userErr) throw new AppError(500, userErr.message)
    if (!userRow) throw new AppError(404, 'Profile missing for this account')

    if (userRow.role !== 'admin') {
      // Invalidate the Supabase session we just created so the token is useless.
      await supabase.auth.signOut()
      throw new AppError(403, 'This account is not an admin')
    }

    res.json({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: userRow,
    })
  } catch (err) {
    next(err)
  }
}
