import type Stripe from 'stripe'
import { supabase, supabaseAdmin } from '../db/supabase.js'
import { getStripe } from '../lib/stripe.js'
import { env } from '../config/env.js'
import { AppError } from '../utils/error-handler.js'
import {
  getLandingCheckoutProvision,
  isLandingCheckoutSession,
  provisionFromLandingCheckoutSession,
} from './landing-checkout-provision.service.js'

export type LandingCheckoutStatus = {
  status: 'pending' | 'ready'
  email: string | null
  name: string | null
}

export type LandingCheckoutCompleteResult = {
  accessToken: string
  refreshToken: string
  user: { id: string; email: string; name: string | null }
  redirectUrl: string
}

/**
 * Validates and loads a paid USA landing Stripe Checkout session.
 */
async function loadPaidLandingSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  if (!sessionId.startsWith('cs_')) {
    throw new AppError(400, 'session_id must be a Stripe Checkout Session id (cs_...)')
  }
  if (!env.stripeEnabled) {
    throw new AppError(503, 'Stripe is not configured')
  }

  const stripe = getStripe()
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription'],
  })

  if (!isLandingCheckoutSession(session)) {
    throw new AppError(400, 'This checkout session is not from the USA landing funnel')
  }

  const paid =
    session.payment_status === 'paid' ||
    session.status === 'complete'

  if (!paid) {
    throw new AppError(402, 'Payment is not complete yet')
  }

  return session
}

/**
 * Ensures the learner account exists for a paid landing checkout (webhook fallback).
 */
async function ensureProvisioned(
  session: Stripe.Checkout.Session
): Promise<{ userId: string; email: string; name: string }> {
  const existing = await getLandingCheckoutProvision(session.id)
  if (existing) {
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('name')
      .eq('id', existing.user_id)
      .maybeSingle()

    return {
      userId: existing.user_id,
      email: existing.email,
      name: profile?.name?.trim() || 'there',
    }
  }

  if (session.mode !== 'subscription' || !session.subscription) {
    throw new AppError(409, 'Subscription is not ready yet. Please wait a moment and try again.')
  }

  const sub =
    typeof session.subscription === 'string'
      ? await getStripe().subscriptions.retrieve(session.subscription)
      : session.subscription

  const result = await provisionFromLandingCheckoutSession(session, sub)
  return { userId: result.userId, email: result.email, name: result.name }
}

/**
 * Poll-friendly status for the USA landing checkout success page.
 */
export async function getLandingCheckoutStatus(
  sessionId: string
): Promise<LandingCheckoutStatus> {
  let session: Stripe.Checkout.Session
  try {
    session = await loadPaidLandingSession(sessionId)
  } catch (err) {
    if (err instanceof AppError && err.statusCode === 402) {
      return { status: 'pending', email: null, name: null }
    }
    throw err
  }

  try {
    const provisioned = await ensureProvisioned(session)
    return {
      status: 'ready',
      email: provisioned.email,
      name: provisioned.name,
    }
  } catch (err) {
    if (err instanceof AppError && err.statusCode === 409) {
      return { status: 'pending', email: null, name: null }
    }
    throw err
  }
}

/**
 * Sets the learner password after landing checkout and returns session tokens for the SPA.
 */
export async function completeLandingCheckoutAccount(args: {
  sessionId: string
  password: string
  name?: string
}): Promise<LandingCheckoutCompleteResult> {
  const session = await loadPaidLandingSession(args.sessionId)
  const { userId, email } = await ensureProvisioned(session)

  const trimmedName = args.name?.trim()
  if (trimmedName) {
    const { error: profileErr } = await supabaseAdmin
      .from('users')
      .update({ name: trimmedName, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (profileErr) throw new AppError(500, profileErr.message)

    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { name: trimmedName },
    })
  }

  const { error: passwordErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: args.password,
    email_confirm: true,
  })

  if (passwordErr) throw new AppError(400, passwordErr.message)

  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password: args.password,
  })

  if (signInErr || !signInData.session) {
    throw new AppError(
      500,
      signInErr?.message ?? 'Account updated but sign-in failed. Use Forgot password on the login page.'
    )
  }

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('id, email, name')
    .eq('id', userId)
    .maybeSingle()

  const appBase = (env.APP_PUBLIC_URL ?? env.APP_URL).replace(/\/+$/, '')
  const hash = new URLSearchParams({
    access_token: signInData.session.access_token,
    refresh_token: signInData.session.refresh_token,
  }).toString()

  return {
    accessToken: signInData.session.access_token,
    refreshToken: signInData.session.refresh_token,
    user: {
      id: userId,
      email: profile?.email ?? email,
      name: profile?.name ?? trimmedName ?? null,
    },
    redirectUrl: `${appBase}/auth/callback#${hash}`,
  }
}
