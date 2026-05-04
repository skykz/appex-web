import { httpClient } from '@shared/api/http-client'

export interface DashboardStats {
  totals: {
    users: number
    activeToday: number
    skills: number
    modules: number
    lessons: number
    chatSessions: number
    chatMessages: number
    lessonsCompleted: number
    activeSubscriptions: number
    revenue: number
    creditsRemaining: number
    contactMessages: number
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
  signupsByDay: Array<{ date: string; count: number }>
}

export const dashboardApi = {
  stats: () => httpClient.get<DashboardStats>('/admin/dashboard'),
}
