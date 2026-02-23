import { httpClient } from '@shared/api'
import type { Skill, SkillCategory } from './mock-data'

interface SkillWithProgress extends Skill {
  progress: number
  status: 'not_started' | 'in_progress' | 'completed'
}

interface SkillDetail extends SkillWithProgress {
  modules: {
    id: number
    title: string
    lessonCount: number
    lessons: {
      id: number
      label: string
      title: string
      emoji: string
      locked: boolean
    }[]
  }[]
}

export const skillsApi = {
  async list(category?: SkillCategory): Promise<SkillWithProgress[]> {
    const params = category && category !== 'all' ? `?category=${category}` : ''
    return httpClient.get(`/skills${params}`)
  },

  async getDetail(id: number): Promise<SkillDetail> {
    return httpClient.get(`/skills/${id}`)
  },
}
