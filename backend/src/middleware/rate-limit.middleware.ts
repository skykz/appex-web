/**
 * Rate limiters.
 *
 * Scope and limits: these are a blunt abuse/DoS backstop, not the business quota.
 * Lexi's real allowance is the atomic per-user daily counter in
 * lexi_claim_daily_quota (migration 040); this layer exists to stop a burst from
 * reaching that check — and the OpenAI bill behind it — thousands of times a
 * second in the first place.
 *
 * DEPLOYMENT CAVEAT: the store is in-memory, and this API also runs on Vercel
 * serverless, where each instance has its own memory and instances scale out. So
 * the effective ceiling is `limit × active instances`, not `limit`. That still
 * removes the single-client burst vector, but it is not a strict global cap — a
 * distributed attack needs a shared store (Redis) to bound properly.
 */

import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import type { Request } from 'express'
import type { AuthenticatedRequest } from '../types/index.js'

/**
 * Keys by authenticated user when available, falling back to IP.
 *
 * Per-user keying matters because NAT and mobile carriers put many learners
 * behind one address: keying purely by IP would let one abuser exhaust the bucket
 * for everyone sharing it. ipKeyGenerator normalises IPv6 into a /64 subnet so a
 * single host cannot rotate through addresses it already controls.
 */
function userOrIpKey(req: Request): string {
  const userId = (req as AuthenticatedRequest).userId
  if (userId) return `u:${userId}`
  return `ip:${ipKeyGenerator(req.ip ?? '')}`
}

/**
 * Global limiter for the whole API. Generous — it should only ever catch scripted
 * traffic, never a person clicking around the app.
 */
export const globalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  message: { error: 'Too many requests. Please slow down and try again shortly.' },
})

/**
 * Tight limiter for the Lexi streaming turn — the only endpoint that spends money
 * per call. 10/min is well above human chat pace (a reply takes seconds to read)
 * and far below what a burst script needs to be profitable.
 *
 * `skipFailedRequests` is deliberately NOT set: a request that fails still cost us
 * an upstream call, so it must count against the bucket.
 */
export const lexiStreamLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  message: {
    error: 'You are sending messages too quickly. Please wait a moment and try again.',
  },
})

/**
 * Cheap per-IP gate that runs BEFORE requireAuth on the Lexi stream.
 *
 * Needed because requireAuth verifies tokens with a network call to Supabase Auth.
 * A limiter placed after it never sees rejected traffic, so spraying garbage
 * Bearer tokens would still cost one outbound auth request each — free
 * amplification against our Supabase quota. This caps that by source address.
 *
 * Set well above the per-user limit: several learners legitimately share one NAT,
 * and this is only meant to stop scripted floods, not real usage.
 */
export const lexiIpGate = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req: Request) => `ip:${ipKeyGenerator(req.ip ?? '')}`,
  message: { error: 'Too many requests. Please try again shortly.' },
})

/**
 * Limiter for unauthenticated auth endpoints (login, signup, password reset).
 *
 * Always keyed by IP, never by user: these run before any token exists, so there
 * is no user to key on, and the point is to slow credential stuffing per source.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req: Request) => `ip:${ipKeyGenerator(req.ip ?? '')}`,
  message: { error: 'Too many attempts. Please try again later.' },
})
