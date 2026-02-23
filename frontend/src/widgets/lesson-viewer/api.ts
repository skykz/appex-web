import { httpClient } from '@shared/api'
import type { LessonStep } from './mock-content'

interface LessonResponse {
  id: number
  label: string
  title: string
  steps: LessonStep[]
  progress: {
    stepIndex: number
    completed: boolean
  }
}

interface LessonProgress {
  id: string
  user_id: string
  lesson_id: number
  step_index: number
  completed: boolean
}

export const lessonApi = {
  async get(id: number): Promise<LessonResponse> {
    return httpClient.get(`/lessons/${id}`)
  },

  async updateProgress(
    id: number,
    stepIndex: number
  ): Promise<LessonProgress> {
    return httpClient.patch(`/lessons/${id}/progress`, { stepIndex })
  },

  async complete(
    id: number,
    data?: { rating?: number; feedback?: string }
  ): Promise<LessonProgress> {
    return httpClient.post(`/lessons/${id}/complete`, data ?? {})
  },
}
