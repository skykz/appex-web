import { httpClient } from '@shared/api'

export interface PromptRecord {
  id: number
  title: string
  category: string
  content: string
  order: number
}

/** User-owned row from `user_prompts`. */
export interface UserPromptRecord {
  id: string
  user_id: string
  title: string
  category: string
  content: string
  sort_order: number
  created_at: string
  updated_at: string
}

/**
 * Loads prompts for the library; optional search and category match server filters.
 */
export async function fetchPrompts(params?: {
  search?: string
  category?: string
}): Promise<PromptRecord[]> {
  const sp = new URLSearchParams()
  if (params?.search?.trim()) sp.set('search', params.search.trim())
  if (params?.category?.trim()) sp.set('category', params.category.trim())
  const q = sp.toString()
  return httpClient.get<PromptRecord[]>(`/prompts${q ? `?${q}` : ''}`)
}

/**
 * Returns distinct category values from the database for filter chips.
 */
export async function fetchPromptCategories(): Promise<string[]> {
  return httpClient.get<string[]>('/prompts/categories')
}

/**
 * Current user’s saved prompts (optional filters mirror curated list).
 */
export async function fetchMyPrompts(params?: {
  search?: string
  category?: string
}): Promise<UserPromptRecord[]> {
  const sp = new URLSearchParams()
  if (params?.search?.trim()) sp.set('search', params.search.trim())
  if (params?.category?.trim()) sp.set('category', params.category.trim())
  const q = sp.toString()
  return httpClient.get<UserPromptRecord[]>(
    `/prompts/mine${q ? `?${q}` : ''}`
  )
}

export async function fetchMyPromptCategories(): Promise<string[]> {
  return httpClient.get<string[]>('/prompts/mine/categories')
}

export async function createMyPrompt(body: {
  title: string
  category: string
  content: string
}): Promise<UserPromptRecord> {
  return httpClient.post<UserPromptRecord>('/prompts/mine', body)
}

export async function updateMyPrompt(
  id: string,
  body: Partial<{ title: string; category: string; content: string }>
): Promise<UserPromptRecord> {
  return httpClient.patch<UserPromptRecord>(`/prompts/mine/${id}`, body)
}

export async function deleteMyPrompt(id: string): Promise<{ success: boolean }> {
  return httpClient.delete<{ success: boolean }>(`/prompts/mine/${id}`)
}
