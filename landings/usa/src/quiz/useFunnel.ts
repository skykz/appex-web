import { useEffect, useState } from 'react'
import {
  ResolvedFunnel,
  resolveFunnelSync,
  resolveFunnelRemote,
  readCreativeSlug,
} from './resolveFunnel'
import { setFunnelDimensions } from '@/lib/quiz-tracker'

/**
 * Resolves and holds the active funnel (product + creative + flow + A/B bucket)
 * for the quiz run, and pushes its dimensions into the tracker so every event is
 * stamped with them.
 *
 * SHAPE OF THE RESOLUTION
 * Synchronous default first (so the first screen paints with no wait), then a
 * one-shot async upgrade when a `?c=` is present and the backend has a better
 * answer. The tracker is updated on BOTH so events fired before the upgrade still
 * carry the creative slug — the upgrade only ever refines product/flow/bucket,
 * never changes which creative the visitor came from.
 *
 * Deliberately does NOT re-resolve on every render or on step changes: the funnel
 * is fixed for the duration of a run. Re-resolving mid-quiz could swap the flow
 * under the visitor's feet, which is never wanted.
 */
export function useFunnel(): ResolvedFunnel {
  const [funnel, setFunnel] = useState<ResolvedFunnel>(() => {
    const initial = resolveFunnelSync()
    // Stamp the tracker synchronously, before any event can fire.
    setFunnelDimensions({
      productSlug: initial.productSlug,
      funnelSlug: initial.funnelSlug,
      flowVersion: initial.flow.version,
      abBucket: initial.abBucket,
    })
    return initial
  })

  useEffect(() => {
    const slug = readCreativeSlug()
    // No creative slug → the sync default is final; nothing better to fetch.
    if (!slug) return

    let cancelled = false
    void resolveFunnelRemote(slug).then((upgraded) => {
      if (cancelled || !upgraded) return
      setFunnelDimensions({
        productSlug: upgraded.productSlug,
        funnelSlug: upgraded.funnelSlug,
        flowVersion: upgraded.flow.version,
        abBucket: upgraded.abBucket,
      })
      setFunnel(upgraded)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return funnel
}
