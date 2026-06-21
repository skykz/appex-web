import type { Request, Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from '../../types/index.js'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'
import { recalculateStreak, todayUTC, normalizeDate } from '../../services/streak.service.js'

export async function getStreak(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest

    const { data } = await supabaseAdmin
      .from('streaks')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (!data) {
      res.json({
        user_id: userId,
        current: 0,
        best: 0,
        milestone: 7,
        last_active_date: null,
      })
      return
    }

    // Decay on read: if the user missed a day, the stored `current` is stale.
    // Recompute against the client's local "today" (falls back to UTC) and
    // persist the corrected value so the streak actually resets to 0.
    const today = normalizeDate(req.query.today) ?? todayUTC()
    const recomputed = await recalculateStreak(userId, today, true)

    res.json({
      ...data,
      current: recomputed.current,
      best: recomputed.best,
      milestone: recomputed.milestone,
    })
  } catch (err) {
    next(err)
  }
}

export async function checkIn(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    // Use the learner's LOCAL calendar day (sent by the client) so evening
    // check-ins in the Americas/Asia count for the right day, not the UTC day.
    const today = normalizeDate((req.body as { date?: unknown } | undefined)?.date) ?? todayUTC()

    const { data: existingToday } = await supabaseAdmin
      .from('streak_days')
      .select('date')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle()

    /** True when this request is the first streak activity for the user on this local day. */
    const firstCheckInToday = !existingToday

    // Insert today's date (upsert to avoid duplicates)
    await supabaseAdmin
      .from('streak_days')
      .upsert(
        { user_id: userId, date: today },
        { onConflict: 'user_id,date' }
      )

    // Recalculate streak relative to the learner's local today.
    const { current, best, milestone } = await recalculateStreak(userId, today, true)

    // Fetch full data
    const { data } = await supabaseAdmin
      .from('streaks')
      .select('*')
      .eq('user_id', userId)
      .single()

    res.json({
      ...(data ?? { user_id: userId, current, best, milestone, last_active_date: today }),
      firstCheckInToday,
    })
  } catch (err) {
    next(err)
  }
}

export async function getCalendar(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    const month = (req.query.month as string) ?? new Date().toISOString().slice(0, 7)

    // Parse YYYY-MM
    const [year, monthNum] = month.split('-').map(Number)
    if (!year || !monthNum) throw new AppError(400, 'Invalid month format. Use YYYY-MM')

    const startDate = `${month}-01`
    // Last day of month: create UTC date for day 0 of next month
    const lastDay = new Date(Date.UTC(year, monthNum, 0)).getUTCDate()
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`

    const { data, error } = await supabaseAdmin
      .from('streak_days')
      .select('date')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (error) throw new AppError(500, error.message)

    res.json({
      activeDays: (data ?? []).map((d) => d.date),
    })
  } catch (err) {
    next(err)
  }
}
