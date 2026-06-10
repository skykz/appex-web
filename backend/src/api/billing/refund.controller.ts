import type { Request, Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from '../../types/index.js'
import { z } from 'zod'
import { AppError } from '../../utils/error-handler.js'
import {
  evaluateRefundEligibility,
  processRefundRequest,
} from '../../services/refund.service.js'

const eligibilityQuerySchema = z.object({
  billingHistoryId: z.string().uuid().optional(),
})

const adminRefundBodySchema = z.object({
  billingHistoryId: z.string().uuid().optional(),
  executeStripeRefund: z.boolean().optional().default(false),
})

/**
 * Returns refund eligibility for the authenticated user (optional billing row).
 */
export async function getRefundEligibility(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    const { billingHistoryId } = eligibilityQuerySchema.parse(req.query)

    const evaluation = await evaluateRefundEligibility({
      userId,
      billingHistoryId,
    })

    res.json(evaluation)
  } catch (err) {
    next(err)
  }
}

/**
 * Admin: evaluate refund eligibility for a user without processing payment.
 */
export async function evaluateAdminRefund(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = String(req.params.userId)
    if (!userId) throw new AppError(400, 'userId is required')

    const { billingHistoryId } = adminRefundBodySchema.parse(req.body ?? {})

    const evaluation = await evaluateRefundEligibility({
      userId,
      billingHistoryId,
    })

    res.json(evaluation)
  } catch (err) {
    next(err)
  }
}

/**
 * Admin: evaluate and optionally execute Stripe refund; logs audit row.
 */
export async function processAdminRefund(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const admin = req as AuthenticatedRequest
    const userId = String(req.params.userId)
    if (!userId) throw new AppError(400, 'userId is required')

    const { billingHistoryId, executeStripeRefund } = adminRefundBodySchema.parse(req.body ?? {})

    const result = await processRefundRequest({
      userId,
      billingHistoryId,
      processedBy: admin.userId,
      executeStripeRefund,
    })

    res.json(result)
  } catch (err) {
    next(err)
  }
}
