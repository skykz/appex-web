import { httpClient } from '@shared/api/http-client'

export interface DashboardStats {
  totals: {
    users: number
    activeToday: number
    skills: number
    lessonsCompleted: number
    activeSubscriptions: number
    revenue: number
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
  stats: () => httpClient.get<DashboardStats>('/admin/dashboard'),
}
