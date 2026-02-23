import { httpClient } from '@shared/api'

interface Prompt {
  id: number
  title: string
  category: string
  content: string
}

export const promptsApi = {
  async list(params?: {
    search?: string
    category?: string
  }): Promise<Prompt[]> {
    const query = new URLSearchParams()
    if (params?.search) query.set('search', params.search)
    if (params?.category) query.set('category', params.category)
    const qs = query.toString()
    return httpClient.get(`/prompts${qs ? `?${qs}` : ''}`)
  },

  async getCategories(): Promise<string[]> {
    return httpClient.get('/prompts/categories')
  },
}
