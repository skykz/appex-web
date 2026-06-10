import { supabaseAdmin } from '../db/supabase.js'
import { subscriptionGrantsAccess } from './subscription-access.js'

/**
 * Returns true when the user has any subscription status that should unlock
 * Premium content, including the 24h grace window after a failed payment.
 */
export async function hasAccess(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('status, payment_failed_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data?.status) return false
  return subscriptionGrantsAccess({
    status: data.status,
    payment_failed_at: data.payment_failed_at,
  })
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

/**
 * Returns the id of the free onboarding skill (lowest order), cached briefly.
 */
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
  const skillId = (data as { module?: { skill_id?: number } } | null)?.module?.skill_id
  return typeof skillId === 'number' ? skillId : null
}
