import { httpClient } from '@shared/api'

export interface StreakData {
  user_id: string
  current: number
  best: number
  milestone: number
  last_active_date: string | null
  /** Present only on `POST /streaks/check-in`: first activity recorded for this local day. */
  firstCheckInToday?: boolean
}

/**
 * Today's date in the user's LOCAL timezone as YYYY-MM-DD. Streaks are about the
 * learner's calendar day, not the server's UTC day — an evening check-in in the
 * Americas/Asia must count for the local day, not roll into UTC tomorrow/yesterday.
 */
function localDateString(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

interface StreakCalendar {
  activeDays: string[]
}

export const streakApi = {
  async get(): Promise<StreakData> {
    // Pass local date so the server decays a stale streak against the user's day.
    return httpClient.get(`/streaks?today=${localDateString()}`)
  },

  /**
   * Records today in streak_days and returns updated streak plus `firstCheckInToday` when this was the first log for the day.
   */
  async checkIn(): Promise<StreakData> {
    // Send the learner's local calendar date so the streak is computed in their
    // timezone, not the server's UTC day.
    return httpClient.post<StreakData>('/streaks/check-in', { date: localDateString() })
  },

  async getCalendar(month?: string): Promise<StreakCalendar> {
    const params = month ? `?month=${month}` : ''
    return httpClient.get(`/streaks/calendar${params}`)
  },
}
