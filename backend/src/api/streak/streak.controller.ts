import type { Request, Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from '../../types/index.js'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'
import { recalculateStreak, todayUTC } from '../../services/streak.service.js'

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

    res.json(
      data ?? {
        user_id: userId,
        current: 0,
        best: 0,
        milestone: 28,
        last_active_date: null,
      }
    )
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
    const today = todayUTC()

    // Insert today's date (upsert to avoid duplicates)
    await supabaseAdmin
      .from('streak_days')
      .upsert(
        { user_id: userId, date: today },
        { onConflict: 'user_id,date' }
      )

    // Recalculate streak
    const { current, best } = await recalculateStreak(userId)

    // Fetch full data
    const { data } = await supabaseAdmin
      .from('streaks')
      .select('*')
      .eq('user_id', userId)
      .single()

    res.json(data ?? { current, best, milestone: 28 })
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
