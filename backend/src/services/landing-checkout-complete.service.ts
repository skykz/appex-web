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
import { getProductPostPurchasePath } from './quiz-funnel.service.js'

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

  // One-time claim: atomically stamp account_completed_at only if still null.
  // This makes setting the password a single-use action per checkout session —
  // a leaked session_id cannot be replayed later to RESET the password and
  // seize an already-set-up account. The UPDATE...is null + row-count check is
  // atomic, so two concurrent completions can't both win.
  const { data: claimRows, error: claimErr } = await supabaseAdmin
    .from('landing_checkout_provisions')
    .update({ account_completed_at: new Date().toISOString() })
    .eq('stripe_checkout_session_id', session.id)
    .is('account_completed_at', null)
    .select('stripe_checkout_session_id')

  if (claimErr) throw new AppError(500, claimErr.message)
  if (!claimRows || claimRows.length === 0) {
    throw new AppError(
      409,
      'This account has already been set up. Use the login page (or Forgot password) to sign in.'
    )
  }

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

  // Route the buyer to their product's surface after sign-in. The checkout
  // stamped product_slug on the session; resolve it to the product's
  // post_purchase_path and pass it as ?next. Null (unknown product or none set)
  // means the callback falls back to /home — the pre-flex behaviour, unchanged
  // for the single-product funnel.
  //
  // ?next rides in the QUERY string, before the #hash: the callback strips the
  // hash (the tokens) via replaceState but preserves search, so next survives.
  const productSlug = session.metadata?.product_slug
  const nextPath = productSlug
    ? await getProductPostPurchasePath(productSlug)
    : null
  const query = nextPath
    ? `?next=${encodeURIComponent(nextPath)}`
    : ''

  return {
    accessToken: signInData.session.access_token,
    refreshToken: signInData.session.refresh_token,
    user: {
      id: userId,
      email: profile?.email ?? email,
      name: profile?.name ?? trimmedName ?? null,
    },
    redirectUrl: `${appBase}/auth/callback${query}#${hash}`,
  }
}
