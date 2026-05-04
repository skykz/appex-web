import { httpClient } from '@shared/api'
import type {
  SkillDetail,
  SkillListItem,
  SkillCategoryFilter,
} from './types'

/**
 * Fetches skills for the catalog grid, optionally filtered by category slug.
 */
export const skillsApi = {
  async list(category?: SkillCategoryFilter): Promise<SkillListItem[]> {
    const params =
      category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : ''
    return httpClient.get(`/skills${params}`)
  },

  /**
   * Loads one skill with modules, lessons, lock state, and user progress.
   */
  async getDetail(id: number): Promise<SkillDetail> {
    return httpClient.get(`/skills/${id}`)
  },
}
