import { supabaseAdmin } from '../db/supabase.js'
import { quizLog } from '../lib/logger.js'
import { pickArm } from './quiz-ab.js'

/**
 * Resolves a creative slug (`?c=`) into the product + flow the client should run.
 *
 * WHY THIS IS A SERVER CONCERN
 * The A/B split lives here, not on the client: a visitor must land in the same
 * arm every time they reload or share the link, and that stickiness has to be
 * decided somewhere with the weights. Deciding it on the client would also let
 * anyone reshuffle their own arm, poisoning the comparison.
 *
 * Mirrors quiz-content.service: cached on the editor's timescale, never throws, a
 * failed read degrades to "no custom flow" so the client keeps its built-in one.
 * A creative resolving to nothing must still yield a working quiz.
 */

export interface FunnelFlowStep {
  step_id: string
  checkpoint: string | null
}

export interface ResolvedFunnelPayload {
  product_slug: string
  funnel_slug: string
  ab_bucket: string
  /** Null when the creative has no custom flow — client runs its default. */
  flow: {
    version: string
    product_slug: string
    steps: FunnelFlowStep[]
  } | null
}

const CACHE_TTL_MS = 60_000

/**
 * Cache key is the creative slug alone; the A/B arm is chosen per-visitor below
 * and is NOT part of the key, so all visitors share one cached funnel definition
 * and the split is applied on top of it.
 */
const cache = new Map<string, { at: number; value: FunnelDefinition | null }>()

/** The funnel's shape as loaded from the DB, before an arm is picked. */
interface FunnelDefinition {
  product_slug: string
  funnel_slug: string
  arms: {
    bucket: string
    weight: number
    version: string
    product_slug: string
    steps: FunnelFlowStep[]
  }[]
}

/**
 * Loads a creative's funnel definition (product + every A/B arm's flow), or null
 * when the slug is unknown/inactive. Cached; never throws.
 */
async function loadFunnelDefinition(
  slug: string
): Promise<FunnelDefinition | null> {
  const hit = cache.get(slug)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value

  try {
    const { data: funnel, error: fErr } = await supabaseAdmin
      .from('quiz_funnels')
      .select('id, slug, is_active, product:product_id ( slug )')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle()

    if (fErr) throw new Error(fErr.message)
    if (!funnel) {
      cache.set(slug, { at: Date.now(), value: null })
      return null
    }

    // Supabase types a single embedded relation as an array; take the first.
    const productSlug =
      (Array.isArray(funnel.product) ? funnel.product[0]?.slug : (funnel.product as { slug?: string })?.slug) ??
      'claude_automation'

    const { data: arms, error: aErr } = await supabaseAdmin
      .from('quiz_funnel_flows')
      .select('weight, bucket, version:version_id ( id, version, product:product_id ( slug ) )')
      .eq('funnel_id', funnel.id)
      .eq('is_active', true)

    if (aErr) throw new Error(aErr.message)

    // No arms → funnel exists but points at no flow yet. Return a definition with
    // the product but zero arms; the caller degrades to "no custom flow".
    if (!arms?.length) {
      const value: FunnelDefinition = {
        product_slug: productSlug,
        funnel_slug: funnel.slug,
        arms: [],
      }
      cache.set(slug, { at: Date.now(), value })
      return value
    }

    // Load the steps for every arm's version in one pass.
    const versionIds = arms
      .map((a) => (Array.isArray(a.version) ? a.version[0]?.id : (a.version as { id?: string })?.id))
      .filter((v): v is string => Boolean(v))

    const stepsByVersion = new Map<string, FunnelFlowStep[]>()
    if (versionIds.length) {
      const { data: steps, error: sErr } = await supabaseAdmin
        .from('quiz_steps')
        .select('version_id, step_id, checkpoint, step_order')
        .in('version_id', versionIds)
        .order('step_order', { ascending: true })

      if (sErr) throw new Error(sErr.message)
      for (const s of steps ?? []) {
        const arr = stepsByVersion.get(s.version_id) ?? []
        arr.push({ step_id: s.step_id, checkpoint: (s as { checkpoint?: string | null }).checkpoint ?? null })
        stepsByVersion.set(s.version_id, arr)
      }
    }

    const value: FunnelDefinition = {
      product_slug: productSlug,
      funnel_slug: funnel.slug,
      arms: arms.map((a) => {
        const ver = Array.isArray(a.version) ? a.version[0] : (a.version as any)
        const verProduct = ver?.product
        const armProductSlug =
          (Array.isArray(verProduct) ? verProduct[0]?.slug : verProduct?.slug) ?? productSlug
        return {
          bucket: a.bucket,
          weight: a.weight ?? 1,
          version: ver?.version ?? 'v1.0.0',
          product_slug: armProductSlug,
          steps: stepsByVersion.get(ver?.id) ?? [],
        }
      }),
    }
    cache.set(slug, { at: Date.now(), value })
    return value
  } catch (err) {
    quizLog.error('quiz_funnel.load_failed', {
      slug,
      message: err instanceof Error ? err.message : 'unknown',
    })
    cache.set(slug, { at: Date.now(), value: null })
    return null
  }
}

/**
 * Resolves a creative into the concrete funnel payload for one visitor.
 *
 * `stableId` is the visitor's anon_id (or session id) — whatever identifies them
 * across reloads — so their A/B arm is sticky. `flow` is null when the creative
 * has no arms yet, telling the client to run its built-in default under this
 * creative's product/slug.
 */
export async function resolveFunnel(
  slug: string,
  stableId: string
): Promise<ResolvedFunnelPayload | null> {
  const def = await loadFunnelDefinition(slug)
  if (!def) return null

  if (!def.arms.length) {
    return {
      product_slug: def.product_slug,
      funnel_slug: def.funnel_slug,
      ab_bucket: 'control',
      flow: null,
    }
  }

  const arm = pickArm(def.arms, stableId || slug, def.funnel_slug)
  return {
    product_slug: arm.product_slug,
    funnel_slug: def.funnel_slug,
    ab_bucket: arm.bucket,
    // An arm whose version has no steps (misconfigured) degrades to "no custom
    // flow" rather than serving an empty quiz.
    flow: arm.steps.length
      ? { version: arm.version, product_slug: arm.product_slug, steps: arm.steps }
      : null,
  }
}

/** Drops the funnel cache after an editor changes routing. */
export function invalidateFunnelCache(slug?: string): void {
  if (slug) cache.delete(slug)
  else cache.clear()
}

/** Cache of product slug → post_purchase_path, on the same editor timescale. */
const productPathCache = new Map<string, { at: number; value: string | null }>()

/**
 * The learner-app path a product sends its buyers to after payment, or null when
 * the product is unknown or has none set.
 *
 * This is what makes "after paying, the video-studio buyer sees a different
 * product" work: the checkout stamps product_slug on the Stripe session, and the
 * post-purchase redirect resolves it here into the right destination path.
 *
 * Never throws; a failed lookup returns null so the buyer lands on the default
 * surface rather than getting an error at the moment they've just paid.
 */
export async function getProductPostPurchasePath(
  productSlug: string
): Promise<string | null> {
  if (!productSlug) return null
  const hit = productPathCache.get(productSlug)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value

  try {
    const { data, error } = await supabaseAdmin
      .from('quiz_products')
      .select('post_purchase_path')
      .eq('slug', productSlug)
      .maybeSingle()

    if (error) throw new Error(error.message)
    const path = (data?.post_purchase_path as string | null) ?? null
    productPathCache.set(productSlug, { at: Date.now(), value: path })
    return path
  } catch (err) {
    quizLog.error('quiz_funnel.product_path_failed', {
      productSlug,
      message: err instanceof Error ? err.message : 'unknown',
    })
    productPathCache.set(productSlug, { at: Date.now(), value: null })
    return null
  }
}
