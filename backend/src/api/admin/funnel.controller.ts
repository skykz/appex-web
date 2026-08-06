import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { getFunnel, getAnswerBreakdown } from '../../services/funnel-analytics.service.js'

const rangeSchema = z.object({
  /** ISO timestamps; defaults to the trailing 30 days in the service. */
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  landing: z.string().max(40).optional(),
  utm_source: z.string().max(200).optional(),
  quiz_version: z.string().max(40).optional(),
  /** Scopes the funnel to one paywall pricing arm; merged arms read wrong. */
  pricing_variant: z.string().max(40).optional(),
})

/**
 * Drop-off funnel: how many sessions reached each screen, and where they left.
 *
 * The whole funnel is returned in one response rather than paged — it is ~40
 * rows, and the admin renders it as a single chart where a partial list would
 * be misleading rather than merely incomplete.
 */
export async function getFunnelReport(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const q = rangeSchema.parse(req.query)
    const report = await getFunnel(q)
    res.json(report)
  } catch (err) {
    next(err)
  }
}

const breakdownSchema = rangeSchema.extend({
  step_id: z.string().min(1).max(120),
})

/** Answer distribution for a single question. */
export async function getStepBreakdown(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const q = breakdownSchema.parse({ ...req.query, step_id: req.params.stepId })
    const data = await getAnswerBreakdown(q.step_id, { from: q.from, to: q.to })
    res.json(data)
  } catch (err) {
    next(err)
  }
}
