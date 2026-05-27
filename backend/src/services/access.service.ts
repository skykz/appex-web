import { supabaseAdmin } from '../db/supabase.js'

/**
 * Subscription statuses that grant the user access to paid content.
 * `paused` is included intentionally — Stripe's pause_collection keeps the
 * subscription "active for entitlement purposes" while temporarily skipping
 * invoicing. `past_due` is included too: the user is still on the hook for
 * the latest invoice and Stripe is retrying it; we don't immediately revoke.
 */
const ACCESS_STATUSES = new Set(['active', 'trialing', 'past_due', 'paused'])

/**
 * Returns true when the user has any subscription status that should unlock
 * Premium content. Defensive: callers can use this for both lesson gating
 * and credit-gating decisions.
 */
export async function hasAccess(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .maybeSingle()
  if (!data?.status) return false
  return ACCESS_STATUSES.has(data.status)
}

/**
 * The first skill (lowest `order`) is free for everyone — this gives new users
 * something to engage with before hitting the paywall. We compute it on demand
 * rather than storing a flag so reordering skills in the admin "just works."
 */
let cachedFreeSkillId: { value: number | null; expires: number } = {
  value: null,
  expires: 0,
}

export async function getFreeSkillId(): Promise<number | null> {
  if (cachedFreeSkillId.expires > Date.now()) return cachedFreeSkillId.value
  const { data } = await supabaseAdmin
    .from('skills')
    .select('id')
    .order('order', { ascending: true })
    .limit(1)
    .maybeSingle()
  cachedFreeSkillId = {
    value: data?.id ?? null,
    // 60s cache — skills don't reorder often, and a stale free skill just
    // means one Premium lesson is briefly free, which is harmless.
    expires: Date.now() + 60_000,
  }
  return cachedFreeSkillId.value
}

/**
 * True when the user can access this specific skill (and its lessons).
 * The first skill is always free; everything else requires `hasAccess`.
 */
export async function canAccessSkill(
  userId: string,
  skillId: number
): Promise<boolean> {
  const freeId = await getFreeSkillId()
  if (freeId !== null && skillId === freeId) return true
  return hasAccess(userId)
}

/**
 * Resolves the parent skill id of a given lesson. Returns null if the lesson
 * doesn't exist (callers should treat that as 404).
 */
export async function getLessonSkillId(
  lessonId: number
): Promise<number | null> {
  const { data } = await supabaseAdmin
    .from('lessons')
    .select('module:modules(skill_id)')
    .eq('id', lessonId)
    .maybeSingle()
  // PostgREST embeds the relation as either an object or null.
  const skillId = (data as { module?: { skill_id?: number } } | null)?.module?.skill_id
  return typeof skillId === 'number' ? skillId : null
}
