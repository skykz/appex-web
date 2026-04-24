import { httpClient } from '@shared/api/http-client'

export interface Course {
  id: number
  title: string
  description: string
  about: string
  emoji: string
  category: string
  duration: string
  order: number
  created_at: string
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
  order?: number
}

export interface Module {
  id: number
  skill_id: number
  title: string
  order: number
  lesson_count?: number
}

export interface ModuleInput {
  title: string
  order?: number
}

export type LessonBlock =
  | { type: 'text'; content: string }
  | { type: 'bold-text'; content: string }
  | { type: 'heading'; content: string }
  | { type: 'image'; src: string; alt?: string }
  | { type: 'list'; items: string[] }
  | { type: 'user-message'; name: string; text: string }
  | { type: 'mentor-message'; text: string }

export interface LessonStep {
  blocks: LessonBlock[]
}

export interface Lesson {
  id: number
  module_id: number
  label: string
  title: string
  emoji: string
  content: LessonStep[]
  order: number
}

export interface LessonInput {
  label: string
  title: string
  emoji: string
  content: LessonStep[]
  order?: number
}

export interface CourseDetail extends Course {
  modules: Array<Module & { lessons: Lesson[] }>
}

export const coursesApi = {
  list: () => httpClient.get<Course[]>('/admin/courses'),
  detail: (id: number) => httpClient.get<CourseDetail>(`/admin/courses/${id}`),
  create: (data: CourseInput) => httpClient.post<Course>('/admin/courses', data),
  update: (id: number, data: Partial<CourseInput>) =>
    httpClient.patch<Course>(`/admin/courses/${id}`, data),
  remove: (id: number) => httpClient.delete<void>(`/admin/courses/${id}`),

  createModule: (courseId: number, data: ModuleInput) =>
    httpClient.post<Module>(`/admin/courses/${courseId}/modules`, data),
  updateModule: (id: number, data: Partial<ModuleInput>) =>
    httpClient.patch<Module>(`/admin/modules/${id}`, data),
  removeModule: (id: number) => httpClient.delete<void>(`/admin/modules/${id}`),

  createLesson: (moduleId: number, data: LessonInput) =>
    httpClient.post<Lesson>(`/admin/modules/${moduleId}/lessons`, data),
  updateLesson: (id: number, data: Partial<LessonInput>) =>
    httpClient.patch<Lesson>(`/admin/lessons/${id}`, data),
  removeLesson: (id: number) => httpClient.delete<void>(`/admin/lessons/${id}`),
}
