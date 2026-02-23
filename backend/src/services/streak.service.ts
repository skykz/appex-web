import { supabaseAdmin } from '../db/supabase.js'

/** Format a Date as YYYY-MM-DD in UTC. */
function toDateString(d: Date): string {
  return d.toISOString().split('T')[0]
}

/** Get today's date string in UTC. */
export function todayUTC(): string {
  return toDateString(new Date())
}

/**
 * Recalculates the current streak by counting consecutive days
 * backwards from today in the streak_days table.
 */
export async function recalculateStreak(userId: string) {
  const today = todayUTC()

  const { data: days } = await supabaseAdmin
    .from('streak_days')
    .select('date')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(365)

  const dateSet = new Set((days ?? []).map((d) => d.date as string))

  let current = 0
  const cursor = new Date(today + 'T00:00:00Z')

  // Count consecutive days from today backwards
  while (true) {
    const dateStr = toDateString(cursor)
    if (dateSet.has(dateStr)) {
      current++
      cursor.setUTCDate(cursor.getUTCDate() - 1)
    } else {
      break
    }
  }

  // Get existing best
  const { data: existing } = await supabaseAdmin
    .from('streaks')
    .select('best')
    .eq('user_id', userId)
    .single()

  const best = Math.max(existing?.best ?? 0, current)

  await supabaseAdmin.from('streaks').upsert(
    {
      user_id: userId,
      current,
      best,
      last_active_date: today,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  return { current, best }
}
