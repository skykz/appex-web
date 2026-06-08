import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseAdmin } from '../../db/supabase.js'
import { env } from '../../config/env.js'
import { sendPostSignupEmailsAsync } from '../../services/lifecycle-email.service.js'
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

const forgotPasswordSchema = z.object({
  email: z.string().email(),
  /** Which SPA should receive the Supabase redirect (`/auth/reset-password`). */
  intent: z.enum(['app', 'admin']).optional().default('app'),
})

const recoverPasswordSchema = z.object({
  accessToken: z.string().min(20),
  newPassword: z.string().min(8),
})

/**
 * Builds the absolute URL Supabase will redirect to after the user clicks the email link (fragment carries tokens).
 */
function passwordResetRedirectUrl(req: Request, intent: 'app' | 'admin'): string {
  const path = '/auth/reset-password'
  const trim = (u: string) => u.replace(/\/+$/, '')

  if (intent === 'admin' && env.ADMIN_APP_PUBLIC_URL?.trim()) {
    return `${trim(env.ADMIN_APP_PUBLIC_URL)}${path}`
  }
  if (env.APP_PUBLIC_URL?.trim()) {
    return `${trim(env.APP_PUBLIC_URL)}${path}`
  }

  const origin = req.get('origin')?.trim()
  if (origin) {
    return `${trim(origin)}${path}`
  }

  return intent === 'admin'
    ? `http://localhost:5174${path}`
    : `http://localhost:5173${path}`
}

/** Fetch the app user record (with `name`) from the users table. */
async function fetchAppUser(userId: string) {
  const { data } = await supabaseAdmin
    .from('users')
    .select('id, email, name, created_at')
    .eq('id', userId)
    .single()
  return data
}

/**
 * Removes partial signup data and the auth user so a failed registration does not strand rows or orphan auth accounts.
 */
async function rollbackSignup(userId: string) {
  await supabaseAdmin.from('user_credits').delete().eq('user_id', userId)
  await supabaseAdmin.from('streaks').delete().eq('user_id', userId)
  await supabaseAdmin.from('users').delete().eq('id', userId)
  await supabaseAdmin.auth.admin.deleteUser(userId)
}

/**
 * Obtains a Supabase session after admin createUser. Retries once with forced email_confirm if the first sign-in returns no session (common when Auth email settings conflict with admin createUser).
 */
async function establishSessionAfterSignup(
  email: string,
  password: string,
  userId: string
): Promise<Session> {
  const trySignIn = () =>
    supabase.auth.signInWithPassword({ email, password })

  let { data, error } = await trySignIn()

  if (data?.session) {
    return data.session
  }

  // No session (e.g. email not confirmed) or sign-in error — force confirm and retry once.
  const { error: confirmErr } =
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    })
  if (confirmErr) {
    console.warn('Signup: admin updateUserById email_confirm:', confirmErr.message)
  }
  const retry = await trySignIn()
  data = retry.data
  error = retry.error

  if (error) {
    throw new AppError(401, error.message)
  }
  if (!data?.session) {
    throw new AppError(
      500,
      'Unable to create a login session after signup. In Supabase Dashboard: enable the Email provider (Authentication → Providers), and either disable “Confirm email” for testing or keep admin signup with email_confirm. Also verify SUPABASE_ANON_KEY matches your project.'
    )
  }
  return data.session
}

/**
 * Validates that password sign-in returned a usable session (avoids crashing on null session).
 */
function requirePasswordSession(session: Session | null, fallbackMessage: string): Session {
  if (!session) {
    throw new AppError(
      401,
      `${fallbackMessage} If the account exists, check that the email is confirmed in Supabase Auth.`
    )
  }
  return session
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const body = loginSchema.parse(req.body)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    })

    if (error) throw new AppError(401, error.message)

    const session = requirePasswordSession(
      data.session,
      'Sign-in did not return a session.'
    )

    const user = await fetchAppUser(data.user.id)

    res.json({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      user: user ?? { id: data.user.id, email: data.user.email },
    })
  } catch (err) {
    next(err)
  }
}

export async function signup(req: Request, res: Response, next: NextFunction) {
  let newUserId: string | null = null

  try {
    const body = signupSchema.parse(req.body)

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
        user_metadata: { name: body.name },
      })

    if (authError) throw new AppError(400, authError.message)
    if (!authData.user?.id) {
      throw new AppError(500, 'Signup did not return a user id')
    }

    newUserId = authData.user.id

    const { error: userErr } = await supabaseAdmin.from('users').insert({
      id: authData.user.id,
      email: body.email,
      name: body.name,
    })

    if (userErr) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      newUserId = null
      throw new AppError(
        500,
        `Could not create profile: ${userErr.message}. Ensure Supabase migrations are applied (public.users exists) and email is unique.`
      )
    }

    const { error: creditsErr } = await supabaseAdmin
      .from('user_credits')
      .insert({ user_id: authData.user.id, balance: 5 })

    if (creditsErr) {
      await rollbackSignup(authData.user.id)
      newUserId = null
      throw new AppError(500, `Could not initialize credits: ${creditsErr.message}`)
    }

    const { error: streakErr } = await supabaseAdmin
      .from('streaks')
      .insert({ user_id: authData.user.id })

    if (streakErr) {
      await rollbackSignup(authData.user.id)
      newUserId = null
      throw new AppError(500, `Could not initialize streak: ${streakErr.message}`)
    }

    const session = await establishSessionAfterSignup(
      body.email,
      body.password,
      authData.user.id
    )

    const user = await fetchAppUser(authData.user.id)

    sendPostSignupEmailsAsync({
      userId: authData.user.id,
      email: body.email,
      name: body.name,
    })

    res.status(201).json({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      user: user ?? { id: authData.user.id, email: body.email, name: body.name },
    })
    newUserId = null
  } catch (err) {
    if (newUserId) {
      try {
        await rollbackSignup(newUserId)
      } catch (cleanupErr) {
        console.error('Signup rollback failed:', cleanupErr)
      }
    }
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

/**
 * Sends a Supabase password recovery email. Response is always neutral to avoid email enumeration.
 */
export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = forgotPasswordSchema.parse(req.body)
    const redirectTo = passwordResetRedirectUrl(req, body.intent)

    const { error } = await supabase.auth.resetPasswordForEmail(body.email, {
      redirectTo,
    })

    if (error) {
      console.warn('resetPasswordForEmail:', error.message)
    }

    res.json({
      ok: true,
      message:
        'If an account exists for that email, we sent a link to reset your password.',
    })
  } catch (err) {
    next(err)
  }
}

/**
 * Completes recovery using the access token from the email link (hash), then sets a new password.
 */
export async function recoverPassword(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = recoverPasswordSchema.parse(req.body)

    const { data: userData, error: userErr } =
      await supabaseAdmin.auth.getUser(body.accessToken)

    if (userErr || !userData.user) {
      throw new AppError(
        401,
        'Invalid or expired recovery link. Request a new reset email.'
      )
    }

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
      userData.user.id,
      { password: body.newPassword }
    )

    if (updateErr) throw new AppError(400, updateErr.message)

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}
