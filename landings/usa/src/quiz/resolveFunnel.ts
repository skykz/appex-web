import { getApiBaseUrl } from '@/lib/landing-api'
import { getAnonId } from '@/lib/attribution'
import { getFunnelDimensions } from '@/lib/quiz-tracker'
import { BUILTIN_FLOWS, DEFAULT_FLOW, QuizFlow } from './flows'

/**
 * Creative slug → a BUILTIN flow the client can render with NO network call.
 *
 * Two jobs: it lets a creative whose flow already ships in the bundle resolve
 * instantly (no round-trip, no blank first frame), and it makes such creatives
 * work with the backend down. A creative NOT listed here still resolves — via the
 * backend (resolveFunnelRemote) or the default — so this map is an
 * optimization/fallback, never the sole source of truth.
 *
 * Empty until a real creative ships a bundled flow. To add one: define its
 * QuizFlow in flows.ts, register its screens in STEP_COMPONENTS_BY_ID, then map
 * `<slug>: THE_FLOW` here.
 */
const BUILTIN_CREATIVE_FLOWS: Record<string, QuizFlow> = {}

/**
 * Resolves `?c=<creative>` on the /quiz URL into the product + flow to render.
 *
 * WHY
 * Paid traffic lands straight on /quiz, never the landing page, and the ad's `?c=`
 * is the only thing that says which of the three products/creatives this visitor
 * clicked. This module turns that slug into a concrete flow, an A/B bucket, and
 * the product/funnel dimensions every event must carry.
 *
 * FALLBACK DISCIPLINE (same rule as loadRemoteQuiz)
 * This sits at the very top of the funnel. It must ALWAYS resolve to a working
 * flow, synchronously, even with the backend down and no `?c=` at all. So it
 * returns the built-in default immediately and, when a `?c=` is present, upgrades
 * asynchronously if the backend has something better. A blank or spinning first
 * screen would burn paid clicks — never acceptable here.
 */

export interface ResolvedFunnel {
  /** Product being sold; drives post-purchase routing and product_slug on events. */
  productSlug: string
  /** Creative slug from `?c=`, or 'default' when absent. Recorded as funnel_slug. */
  funnelSlug: string
  /** A/B arm name; 'control' unless a split assigned another. Recorded as ab_bucket. */
  abBucket: string
  /** The flow to render. Never null. */
  flow: QuizFlow
}

/**
 * Backend shape returned by GET /landing/quiz/funnel?c=<slug>.
 *
 * Two forms: `{ funnel: null }` for an unknown/failed resolution (the client uses
 * its default), or the full resolution object. Modelled as a partial so one
 * parse handles both without a discriminant.
 */
interface RemoteFunnel {
  funnel?: null
  product_slug?: string
  funnel_slug?: string
  ab_bucket?: string
  flow?: {
    version: string
    product_slug: string
    steps: { step_id: string; checkpoint?: string | null }[]
  } | null
}

const TIMEOUT_MS = 2500

/** The `?c=` value, or null. Read from the address bar, tolerant of SSR. */
export function readCreativeSlug(): string | null {
  if (typeof window === 'undefined') return null
  const c = new URLSearchParams(window.location.search).get('c')
  const trimmed = c?.trim()
  return trimmed ? trimmed : null
}

/**
 * The synchronous, always-safe answer. Returned before any network call so the
 * first screen can paint immediately.
 *
 * With a `?c=` present, tag the default flow with that creative slug (events are
 * attributed correctly even if the async upgrade never lands).
 *
 * With NO `?c=`, recover whatever funnel a previous screen already established
 * (persisted in the tracker). This is what keeps the creative stable across the
 * quiz → paywall → checkout journey: those later routes have no `?c=` in their
 * URL, and without this recovery the paywall would reset the funnel to 'default'
 * and the purchase would be mis-attributed and mis-routed. Only when nothing was
 * ever established do we fall back to the true default.
 */
export function resolveFunnelSync(): ResolvedFunnel {
  const slug = readCreativeSlug()
  if (!slug) {
    // No creative in the URL — inherit the already-established funnel if there is
    // one, rather than clobbering it with defaults.
    const prior = (() => {
      try {
        return getFunnelDimensions()
      } catch {
        return null
      }
    })()
    return {
      productSlug: prior?.productSlug ?? DEFAULT_FLOW.productSlug,
      funnelSlug: prior?.funnelSlug ?? 'default',
      abBucket: prior?.abBucket ?? 'control',
      flow: DEFAULT_FLOW,
    }
  }
  // A creative whose flow is bundled resolves instantly to it — no round-trip.
  const builtin = BUILTIN_CREATIVE_FLOWS[slug]
  if (builtin) {
    return {
      productSlug: builtin.productSlug,
      funnelSlug: slug,
      abBucket: 'control',
      flow: builtin,
    }
  }
  // Otherwise: default flow now, tagged with the creative; the async resolver may
  // upgrade it if the backend has a custom flow for this slug.
  return {
    productSlug: DEFAULT_FLOW.productSlug,
    funnelSlug: slug,
    abBucket: 'control',
    flow: DEFAULT_FLOW,
  }
}

let inflight: Promise<ResolvedFunnel | null> | null = null

/**
 * Fetches the funnel mapping for a creative and, if it names a flow the client
 * can render, returns the upgraded resolution. Resolves to null on any
 * failure/timeout/absence so the caller keeps the sync default.
 *
 * A remote flow is only adopted when EVERY one of its step_ids is renderable
 * locally (present in BUILTIN_FLOWS' union of known ids OR the backend sent a
 * flow whose ids we recognise). A remote flow referencing a screen this client
 * build doesn't have would render blanks mid-quiz — worse than the default — so
 * such a flow is rejected wholesale rather than rendered partially.
 */
export function resolveFunnelRemote(slug: string): Promise<ResolvedFunnel | null> {
  if (inflight) return inflight

  const base = getApiBaseUrl()
  if (!base) return Promise.resolve(null)

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS)

  // anon_id makes the server's A/B arm sticky for this visitor across reloads.
  const anon = (() => {
    try {
      return getAnonId()
    } catch {
      return ''
    }
  })()
  const qs = new URLSearchParams({ c: slug })
  if (anon) qs.set('anon_id', anon)

  inflight = fetch(`${base}/landing/quiz/funnel?${qs.toString()}`, {
    signal: controller.signal,
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((body: RemoteFunnel | null): ResolvedFunnel | null => {
      // `null` body or the explicit `{ funnel: null }` miss → use the default.
      if (!body || body.funnel === null) return null
      const remote = body.flow
      // No custom flow for this creative → keep the default flow but adopt the
      // product/funnel/bucket the backend assigned, so attribution is still right.
      if (!remote || !Array.isArray(remote.steps) || remote.steps.length === 0) {
        return {
          productSlug: body.product_slug || DEFAULT_FLOW.productSlug,
          funnelSlug: body.funnel_slug || slug,
          abBucket: body.ab_bucket || 'control',
          flow: DEFAULT_FLOW,
        }
      }

      const flow: QuizFlow = {
        version: remote.version,
        productSlug: remote.product_slug || body.product_slug || DEFAULT_FLOW.productSlug,
        steps: remote.steps.map((s) => ({
          stepId: s.step_id,
          checkpoint: (s.checkpoint || undefined) as QuizFlow['steps'][number]['checkpoint'],
        })),
      }

      // Guard: refuse a flow whose screens this build can't draw. renderableStepIds
      // is the set of ids the local registry knows; a remote flow must be a subset.
      if (!flow.steps.every((s) => renderableStepIds.has(s.stepId))) {
        return null
      }

      return {
        productSlug: flow.productSlug,
        funnelSlug: body.funnel_slug || slug,
        abBucket: body.ab_bucket || 'control',
        flow,
      }
    })
    .catch(() => null)
    .finally(() => {
      window.clearTimeout(timer)
      inflight = null
    })

  return inflight
}

/**
 * The set of step_ids this build can render, filled in by the render registry
 * (overlay-blocks.ts) at module load. Kept here, not imported from the registry,
 * to avoid a cycle: the registry imports flow types, and this file would
 * otherwise import the registry.
 */
export const renderableStepIds = new Set<string>()

/** Registers the ids the local component registry can draw. Called once by it. */
export function registerRenderableSteps(ids: Iterable<string>): void {
  for (const id of ids) renderableStepIds.add(id)
}

/** Every id in the built-in flows is renderable by definition. Seed them now. */
for (const flow of Object.values(BUILTIN_FLOWS)) {
  for (const s of flow.steps) renderableStepIds.add(s.stepId)
}
