import { httpClient } from '@shared/api/http-client'

/** Window applied to the dashboard's time-bounded metrics. */
export type DashboardRange = 'all' | '7d' | '30d' | '90d'

export interface DashboardStats {
  range: DashboardRange
  totals: {
    users: number
    activeToday: number
    skills: number
    lessonsCompleted: number
    activeSubscriptions: number
    revenue: number
  }
  /** Landing-quiz funnel, counted per attempt (session), not per device. */
  quiz: {
    started: number
    completed: number
    abandoned: number
    /** completed / started, as a percentage. */
    completionRate: number
    /** Attempts that got as far as the email step. */
    reachedEmail: number
  }
  recentUsers: Array<{
    id: string
    email: string
    name: string
    created_at: string
  }>
  recentLessonsCompleted: Array<{
    user_id: string
    user_email: string
    lesson_title: string
    completed_at: string
  }>
}

export const dashboardApi = {
  stats: (range: DashboardRange = 'all') =>
    httpClient.get<DashboardStats>(`/admin/dashboard?range=${range}`),
}
