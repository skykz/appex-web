import type { Request, Response, NextFunction } from 'express'
import { env } from '../../config/env.js'
import { processDueRenewalReminders } from '../../services/lifecycle-email.service.js'
import { AppError } from '../../utils/error-handler.js'

/**
 * Verifies the Vercel Cron secret or manual CRON_SECRET header.
 */
function assertCronAuthorized(req: Request): void {
  const secret = env.CRON_SECRET
  if (!secret) {
    throw new AppError(503, 'Cron is not configured (CRON_SECRET missing)')
  }

  const auth = req.headers.authorization
  if (auth === `Bearer ${secret}`) return

  const vercelCron = req.headers['x-vercel-cron-secret']
  if (vercelCron && vercelCron === secret) return

  throw new AppError(401, 'Unauthorized cron request')
}

/**
 * Daily job: sends E3 renewal reminders 3 days before current_period_end.
 */
export async function runRenewalEmailCron(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    assertCronAuthorized(req)
    const result = await processDueRenewalReminders()
    res.json({ ok: true, ...result })
  } catch (err) {
    next(err)
  }
}
