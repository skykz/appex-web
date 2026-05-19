import { httpClient } from '@shared/api/http-client'

export interface Category {
  id: number
  slug: string
  label: string
  order: number
  is_visible: boolean
  skill_count?: number
}

export interface CategoryInput {
  slug: string
  label: string
  is_visible?: boolean
  order?: number
}

export const categoriesApi = {
  list: () => httpClient.get<Category[]>('/admin/categories'),
  create: (data: CategoryInput) => httpClient.post<Category>('/admin/categories', data),
  update: (id: number, data: Partial<CategoryInput>) =>
    httpClient.patch<Category>(`/admin/categories/${id}`, data),
  remove: (id: number, options?: { force?: boolean }) =>
    httpClient.delete<void>(`/admin/categories/${id}${options?.force ? '?force=true' : ''}`),
}
