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
 * Returns the id of the free onboarding skill: the lowest-order skill that is
 * actually visible in the learner catalog.
 *
 * Must match the visibility filter used by listSkills/getSkillDetail. If we
 * picked the globally-lowest-order skill ignoring visibility, a hidden skill
 * could be deemed "free" while every skill the learner can actually see is
 * paywalled — locking the whole catalog. Cache is short (10s) so an admin
 * reorder takes effect almost immediately instead of paywalling/free-ing a
 * skill for up to a minute.
 */
export async function getFreeSkillId(): Promise<number | null> {
  if (cachedFreeSkillId.expires > Date.now()) return cachedFreeSkillId.value

  // Restrict to visible categories first, then lowest-order visible skill.
  const { data: visibleCategories } = await supabaseAdmin
    .from('categories')
    .select('slug')
    .eq('is_visible', true)
  const slugs = (visibleCategories ?? []).map((c) => c.slug as string)

  let value: number | null = null
  if (slugs.length > 0) {
    const { data } = await supabaseAdmin
      .from('skills')
      .select('id')
      .eq('is_visible', true)
      .in('category', slugs)
      .order('order', { ascending: true })
      .limit(1)
      .maybeSingle()
    value = data?.id ?? null
  }

  cachedFreeSkillId = {
    value,
    expires: Date.now() + 10_000,
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
