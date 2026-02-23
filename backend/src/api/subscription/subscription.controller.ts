import type { Request, Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from '../../types/index.js'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'

export async function getSubscription(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw new AppError(500, error.message)

    if (!data) {
      res.json(null)
      return
    }

    res.json(data)
  } catch (err) {
    next(err)
  }
}

export async function pauseSubscription(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'paused',
        paused_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('status', 'active')
      .select()
      .single()

    if (error || !data)
      throw new AppError(400, 'No active subscription to pause')

    res.json(data)
  } catch (err) {
    next(err)
  }
}

export async function getBillingHistory(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest

    const { data, error } = await supabaseAdmin
      .from('billing_history')
      .select('*')
      .eq('user_id', userId)
      .order('paid_at', { ascending: false })

    if (error) throw new AppError(500, error.message)

    res.json(data ?? [])
  } catch (err) {
    next(err)
  }
}
