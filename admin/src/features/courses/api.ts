import { httpClient } from '@shared/api/http-client'
import type { LessonBlock, LessonStep } from '@appex/lesson-schema'

export type { LessonBlock, LessonStep }

export interface Course {
  id: number
  title: string
  description: string
  about: string
  emoji: string
  category: string
  duration: string
  order: number
  is_visible: boolean
  created_at: string
  cert_title?: string | null
  cert_description?: string | null
  cert_tags?: string[]
  module_count?: number
  lesson_count?: number
}

export interface CourseInput {
  title: string
  description: string
  about: string
  emoji: string
  category: string
  duration: string
  is_visible?: boolean
  cert_title?: string | null
  cert_description?: string | null
  cert_tags?: string[]
}

export interface Module {
  id: number
  skill_id: number
  title: string
  order: number
  is_visible: boolean
  lesson_count?: number
}

export interface ModuleInput {
  title: string
  is_visible?: boolean
}

export interface Lesson {
  id: number
  module_id: number
  label: string
  title: string
  emoji: string
  content: LessonStep[]
  order: number
  is_visible: boolean
}

export interface LessonInput {
  label: string
  title: string
  emoji: string
  content: LessonStep[]
  is_visible?: boolean
  order?: number
}

export interface CourseDetail extends Course {
  modules: Array<Module & { lessons: Lesson[] }>
}

/** Admin lesson insights: quiz attempts by block + submissions (GET …/engagement). */
export interface LessonEngagementResponse {
  lesson: { id: number; label: string; title: string }
  summary: {
    totalQuizAttempts: number
    statsApproximate: boolean
    statsSampleSize: number
    uniqueQuizBlocks: number
  }
  quizByBlock: Array<{
    stepIndex: number
    blockIndex: number
    attempts: number
    correct: number
    wrong: number
    wrongRate: number
  }>
  openResponses: Array<{
    stepIndex: number
    blockIndex: number
    userEmail: string
    userName: string | null
    text: string
    createdAt: string
  }>
  submissions: {
    total: number
    recent: Array<{
      id: string
      message: string | null
      attachmentUrl: string | null
      status: string
      createdAt: string
      userEmail: string
      userName: string | null
    }>
  }
}

export const coursesApi = {
  list: () => httpClient.get<Course[]>('/admin/courses'),
  detail: (id: number) => httpClient.get<CourseDetail>(`/admin/courses/${id}`),
  create: (data: CourseInput) => httpClient.post<Course>('/admin/courses', data),
  update: (id: number, data: Partial<CourseInput>) =>
    httpClient.patch<Course>(`/admin/courses/${id}`, data),
  remove: (id: number, options?: { force?: boolean }) =>
    httpClient.delete<void>(`/admin/courses/${id}${options?.force ? '?force=true' : ''}`),

  createModule: (courseId: number, data: ModuleInput) =>
    httpClient.post<Module>(`/admin/courses/${courseId}/modules`, data),
  updateModule: (id: number, data: Partial<ModuleInput>) =>
    httpClient.patch<Module>(`/admin/modules/${id}`, data),
  removeModule: (id: number, options?: { force?: boolean }) =>
    httpClient.delete<void>(`/admin/modules/${id}${options?.force ? '?force=true' : ''}`),

  createLesson: (moduleId: number, data: LessonInput) =>
    httpClient.post<Lesson>(`/admin/modules/${moduleId}/lessons`, data),
  updateLesson: (id: number, data: Partial<LessonInput>) =>
    httpClient.patch<Lesson>(`/admin/lessons/${id}`, data),
  removeLesson: (id: number, options?: { force?: boolean }) =>
    httpClient.delete<void>(`/admin/lessons/${id}${options?.force ? '?force=true' : ''}`),

  lessonEngagement: (lessonId: number) =>
    httpClient.get<LessonEngagementResponse>(`/admin/lessons/${lessonId}/engagement`),

  reorderCourses: (orderedIds: number[]) =>
    httpClient.patch<void>('/admin/courses/order', { orderedIds }),

  reorderModules: (courseId: number, orderedIds: number[]) =>
    httpClient.patch<void>(`/admin/courses/${courseId}/modules/reorder`, { orderedIds }),

  reorderLessons: (moduleId: number, orderedIds: number[]) =>
    httpClient.patch<void>(`/admin/modules/${moduleId}/lessons/reorder`, { orderedIds }),
}
