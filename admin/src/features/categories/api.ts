import { httpClient } from '@shared/api/http-client'

export interface Category {
  id: number
  slug: string
  label: string
  order: number
  skill_count?: number
}

export interface CategoryInput {
  slug: string
  label: string
  order?: number
}

export const categoriesApi = {
  list: () => httpClient.get<Category[]>('/admin/categories'),
  create: (data: CategoryInput) => httpClient.post<Category>('/admin/categories', data),
  update: (id: number, data: Partial<CategoryInput>) =>
    httpClient.patch<Category>(`/admin/categories/${id}`, data),
  remove: (id: number) => httpClient.delete<void>(`/admin/categories/${id}`),
}
