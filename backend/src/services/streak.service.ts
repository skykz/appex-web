import { supabaseAdmin } from '../db/supabase.js'

/** Format a Date as YYYY-MM-DD in UTC. */
function toDateString(d: Date): string {
  return d.toISOString().split('T')[0]
}

/** Get today's date string in UTC (server fallback when the client sends none). */
export function todayUTC(): string {
  return toDateString(new Date())
}

/** Validates a YYYY-MM-DD string; returns it or null. */
export function normalizeDate(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  // Reject impossible dates (e.g. 2026-13-40) by round-tripping through Date.
  const d = new Date(value + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return null
  return toDateString(d)
}

/** Step a YYYY-MM-DD string back by one day (UTC-safe, date-only). */
function previousDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - 1)
  return toDateString(d)
}

/** Milestone ladder — the next goal the learner is working toward. */
const MILESTONE_STEPS = [7, 14, 28, 60, 100, 180, 365]

/**
 * Returns the smallest milestone strictly greater than `current`, so the goal
 * always sits ahead of the user. Past the top rung it grows in 365-day steps.
 */
export function milestoneFor(current: number): number {
  for (const m of MILESTONE_STEPS) {
    if (current < m) return m
  }
  // Beyond the last fixed rung, advance by whole years.
  return Math.ceil((current + 1) / 365) * 365
}

/**
 * Recalculates the current streak by counting consecutive days backwards from
 * `today` (the learner's LOCAL calendar day) in the streak_days table.
 *
 * `persist` writes the result; pass false for a read-only recompute (so GET can
 * decay a stale streak without rewriting last_active_date on every read).
 */
export async function recalculateStreak(
  userId: string,
  today: string = todayUTC(),
  persist = true
): Promise<{ current: number; best: number; milestone: number }> {
  // Pull recent days, newest first. We only need a window long enough to cover
  // the active run; 1000 rows is far beyond any real consecutive streak while
  // still bounding the query (the old 365 cap silently truncated long streaks).
  const { data: days } = await supabaseAdmin
    .from('streak_days')
    .select('date')
    .eq('user_id', userId)
    .lte('date', today)
    .order('date', { ascending: false })
    .limit(1000)

  const dateSet = new Set((days ?? []).map((d) => d.date as string))

  let current = 0
  let cursor = today
  while (dateSet.has(cursor)) {
    current++
    cursor = previousDay(cursor)
  }

  const { data: existing } = await supabaseAdmin
    .from('streaks')
    .select('best')
    .eq('user_id', userId)
    .maybeSingle()

  const best = Math.max(existing?.best ?? 0, current)
  const milestone = milestoneFor(current)

  if (persist) {
    const row: Record<string, unknown> = {
      user_id: userId,
      current,
      best,
      milestone,
      updated_at: new Date().toISOString(),
    }
    // Only stamp last_active_date when the user is actually active today; a
    // read-time decay (current dropped to 0 after a missed day) must not rewrite
    // the historical last-active date.
    if (current > 0) row.last_active_date = today
    await supabaseAdmin.from('streaks').upsert(row, { onConflict: 'user_id' })
  }

  return { current, best, milestone }
}
