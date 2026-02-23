import { httpClient } from '@shared/api'

interface StreakData {
  user_id: string
  current: number
  best: number
  milestone: number
  last_active_date: string | null
}

interface StreakCalendar {
  activeDays: string[]
}

export const streakApi = {
  async get(): Promise<StreakData> {
    return httpClient.get('/streaks')
  },

  async checkIn(): Promise<StreakData> {
    return httpClient.post('/streaks/check-in')
  },

  async getCalendar(month?: string): Promise<StreakCalendar> {
    const params = month ? `?month=${month}` : ''
    return httpClient.get(`/streaks/calendar${params}`)
  },
}
