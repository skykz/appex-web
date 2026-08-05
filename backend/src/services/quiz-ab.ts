import { createHash } from 'crypto'

/**
 * Deterministic A/B arm selection. Kept in its own module — free of any DB or env
 * import — so it can be unit-tested without booting the whole service, and so the
 * split logic is auditable in one place.
 */

/**
 * Picks an arm for a visitor from weighted arms.
 *
 * Hash of (stableId + funnelSlug) mapped onto the cumulative weights, so the SAME
 * visitor always lands in the SAME arm — reloads and shared links stay consistent
 * — while the population splits by weight. Salting with the funnel slug keeps a
 * visitor's arm in one test independent of their arm in another.
 *
 * Zero-weight arms are excluded (a paused arm gets no new traffic) unless every
 * arm is zero, in which case the first is returned rather than failing.
 */
export function pickArm<T extends { bucket: string; weight: number }>(
  arms: T[],
  stableId: string,
  funnelSlug: string
): T {
  const positive = arms.filter((a) => a.weight > 0)
  const pool = positive.length ? positive : arms
  if (pool.length === 1) return pool[0]

  const total = pool.reduce((sum, a) => sum + a.weight, 0)
  if (total <= 0) return pool[0]

  // First 8 hex digits of the digest → a fraction in [0,1). Deterministic per
  // (visitor, funnel), unlike Math.random which would re-roll on every request.
  const digest = createHash('sha256').update(`${stableId}:${funnelSlug}`).digest('hex')
  const fraction = parseInt(digest.slice(0, 8), 16) / 0xffffffff
  let cursor = fraction * total
  for (const arm of pool) {
    cursor -= arm.weight
    if (cursor < 0) return arm
  }
  return pool[pool.length - 1]
}
