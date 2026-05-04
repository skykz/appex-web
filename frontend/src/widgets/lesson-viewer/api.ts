import { httpClient } from '@shared/api'
import type { LessonStep } from './lesson-types'

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

/**
 * Authenticated lesson endpoints: fetch content, step progress, and completion.
 */
export const lessonApi = {
  async get(id: number): Promise<LessonResponse> {
    return httpClient.get(`/lessons/${id}`)
  },

  async updateProgress(id: number, stepIndex: number): Promise<LessonProgress> {
    return httpClient.patch(`/lessons/${id}/progress`, { stepIndex })
  },

  async complete(
    id: number,
    data?: { rating?: number; feedback?: string }
  ): Promise<LessonProgress> {
    return httpClient.post(`/lessons/${id}/complete`, data ?? {})
  },

  async checkQuiz(
    lessonId: number,
    body: {
      stepIndex: number
      blockIndex: number
      selectedIndices?: number[]
      openAnswer?: string
    }
  ): Promise<{ correct: boolean; explanation: string | null }> {
    return httpClient.post(`/lessons/${lessonId}/quiz-check`, body)
  },

  async submitSubmission(
    lessonId: number,
    body: { message: string; attachmentUrl?: string }
  ): Promise<{ id: string; created_at: string }> {
    return httpClient.post(`/lessons/${lessonId}/submissions`, body)
  },

  async getMySubmission(lessonId: number): Promise<{
    id: string
    message: string | null
    attachment_url: string | null
    status: string
    admin_feedback: string | null
    created_at: string
  } | null> {
    return httpClient.get(`/lessons/${lessonId}/submissions/me`)
  },

  /**
   * Sends a learner-reported issue to the shared `/contact` inbox with category `bug` and lesson context in the subject.
   */
  async reportIssue(body: {
    lessonId: number
    lessonLabel: string
    stepIndex: number
    stepCount: number
    details: string
  }): Promise<{ success: boolean }> {
    const step = body.stepIndex + 1
    return httpClient.post('/contact', {
      category: 'bug' as const,
      subject: `Lesson issue: ${body.lessonLabel} (#${body.lessonId}), step ${step}/${body.stepCount}`,
      message: body.details,
    })
  },
}
