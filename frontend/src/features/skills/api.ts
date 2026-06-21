import { httpClient } from '@shared/api'
import { config } from '@shared/config'
import type {
  SkillDetail,
  SkillListItem,
  SkillCategoryFilter,
} from './types'

/** Public certificate verification result (no auth required). */
export type VerifyResult =
  | { valid: false }
  | {
      valid: true
      certificate: {
        cert_code: string
        user_name: string
        course_title: string
        issued_at: string
      }
    }

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

  /**
   * Resolves a credential code on the public verify endpoint. Uses a bare fetch
   * (no auth headers) so the page works while signed out / shared externally.
   */
  async verifyCertificate(code: string): Promise<VerifyResult> {
    const res = await fetch(
      `${config.apiUrl}/certificates/verify/${encodeURIComponent(code)}`
    )
    if (!res.ok) return { valid: false }
    return (await res.json()) as VerifyResult
  },
}
