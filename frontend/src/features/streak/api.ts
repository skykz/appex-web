import { httpClient } from '@shared/api'

export interface StreakData {
  user_id: string
  current: number
  best: number
  milestone: number
  last_active_date: string | null
  /** Present only on `POST /streaks/check-in`: first activity recorded for this UTC day. */
  firstCheckInToday?: boolean
}

interface StreakCalendar {
  activeDays: string[]
}

export const streakApi = {
  async get(): Promise<StreakData> {
    return httpClient.get('/streaks')
  },

  /**
   * Records today in streak_days and returns updated streak plus `firstCheckInToday` when this was the first log for the day.
   */
  async checkIn(): Promise<StreakData> {
    return httpClient.post<StreakData>('/streaks/check-in')
  },

  async getCalendar(month?: string): Promise<StreakCalendar> {
    const params = month ? `?month=${month}` : ''
    return httpClient.get(`/streaks/calendar${params}`)
  },
}
