import crypto from 'crypto'
import { supabaseAdmin } from '../db/supabase.js'
import { AppError } from '../utils/error-handler.js'

export type AppUserRow = {
  id: string
  email: string
  name: string | null
}

/**
 * Normalizes email for lookup and storage across auth and marketing tables.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Loads a learner profile row by email, if one exists.
 */
export async function findUserByEmail(email: string): Promise<AppUserRow | null> {
  const normalized = normalizeEmail(email)
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email, name')
    .eq('email', normalized)
    .maybeSingle()

  if (error) throw new AppError(500, error.message)
  return data as AppUserRow | null
}

/**
 * Removes partial signup rows and the auth user after a failed provision attempt.
 */
async function rollbackUser(userId: string): Promise<void> {
  await supabaseAdmin.from('user_credits').delete().eq('user_id', userId)
  await supabaseAdmin.from('streaks').delete().eq('user_id', userId)
  await supabaseAdmin.from('users').delete().eq('id', userId)
  await supabaseAdmin.auth.admin.deleteUser(userId)
}

/**
 * Ensures free-tier credits and streak rows exist for an existing account.
 */
export async function ensureUserCreditsAndStreaks(userId: string): Promise<void> {
  const { data: credits } = await supabaseAdmin
    .from('user_credits')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!credits) {
    const { error } = await supabaseAdmin
      .from('user_credits')
      .insert({ user_id: userId, balance: 5 })
    if (error) throw new AppError(500, error.message)
  }

  const { data: streak } = await supabaseAdmin
    .from('streaks')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!streak) {
    const { error } = await supabaseAdmin.from('streaks').insert({ user_id: userId })
    if (error) throw new AppError(500, error.message)
  }
}

/**
 * Finds or creates a passwordless learner account for payment-first USA checkout.
 */
export async function provisionPasswordlessUser(args: {
  email: string
  name?: string
  source?: string
}): Promise<{ userId: string; name: string; created: boolean }> {
  const email = normalizeEmail(args.email)
  const displayName = args.name?.trim() || 'there'

  const existing = await findUserByEmail(email)
  if (existing) {
    await ensureUserCreditsAndStreaks(existing.id)
    return {
      userId: existing.id,
      name: existing.name?.trim() || displayName,
      created: false,
    }
  }

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password: crypto.randomBytes(32).toString('hex'),
      email_confirm: true,
      user_metadata: { name: displayName, source: args.source ?? 'usa_checkout' },
    })

  if (authError) throw new AppError(500, authError.message)
  if (!authData.user?.id) {
    throw new AppError(500, 'User provision did not return an id')
  }

  const userId = authData.user.id

  try {
    const { error: userErr } = await supabaseAdmin.from('users').insert({
      id: userId,
      email,
      name: displayName,
    })
    if (userErr) throw new AppError(500, userErr.message)

    await ensureUserCreditsAndStreaks(userId)

    return { userId, name: displayName, created: true }
  } catch (err) {
    await rollbackUser(userId)
    throw err
  }
}
