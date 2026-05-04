import { describe, expect, it } from 'vitest'
import { courseFormSchema } from './course-form'

describe('courseFormSchema', () => {
  it('accepts a minimal valid payload', () => {
    const parsed = courseFormSchema.parse({
      title: 'AI Basics',
      description: 'Short description for the catalog card that is long enough.',
      about: 'Longer about body for the course landing area.',
      emoji: '📘',
      category: 'marketing',
      duration: '3 hours',
    })
    expect(parsed.title).toBe('AI Basics')
  })

  it('accepts an https image URL as catalog badge', () => {
    const parsed = courseFormSchema.parse({
      title: 'AI Basics',
      description: 'Short description for the catalog card that is long enough.',
      about: 'Longer about body for the course landing area.',
      emoji: 'https://example.com/course-cover.png',
      category: 'marketing',
      duration: '3 hours',
    })
    expect(parsed.emoji).toContain('example.com')
  })

  it('rejects a title that is too short', () => {
    expect(() =>
      courseFormSchema.parse({
        title: 'x',
        description: 'Short description for the catalog card that is long enough.',
        about: 'Longer about body for the course landing area.',
        emoji: '📘',
        category: 'marketing',
        duration: '3 hours',
      })
    ).toThrow()
  })
})
