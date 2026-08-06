import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { getPricingExperiment } from '../../services/pricing-experiment.service.js'

const querySchema = z.object({
  /** ISO timestamps; defaults to the trailing 30 days in the service. */
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  landing: z.string().max(40).optional(),
})

/**
 * Paywall pricing A/B report, one block per arm.
 *
 * Returned whole rather than paged — it is a handful of arms, and a partial
 * comparison is worse than none.
 */
export async function getPricingExperimentReport(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const q = querySchema.parse(req.query)
    const report = await getPricingExperiment(q)
    res.json(report)
  } catch (err) {
    next(err)
  }
}
