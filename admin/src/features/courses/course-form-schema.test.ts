import { describe, expect, it } from 'vitest'
import { courseFormSchema } from './course-form'
import { parseCertTags } from './cert-form-utils'
import { buildCertificatePreviewData } from './certificate-preview-data'

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

describe('parseCertTags', () => {
  it('parses newline-separated tags and caps at eight', () => {
    const tags = parseCertTags('Prompt Engineering\n\nAI Automation\n  Research  ')
    expect(tags).toEqual(['Prompt Engineering', 'AI Automation', 'Research'])
  })
})

describe('buildCertificatePreviewData', () => {
  it('uses certificate title and sample learner fields', () => {
    const data = buildCertificatePreviewData({
      courseTitle: 'Catalog title',
      cert_title: 'MASTER THE\nCLAUDE',
      cert_description: 'Awarded for completing the program.',
      cert_tags_text: 'Prompt Engineering\nAI Automation',
    })
    expect(data.recipientName).toBe('Jane Doe')
    expect(data.courseTitle).toBe('MASTER THE\nCLAUDE')
    expect(data.certCode).toBe('APX-2026-000000')
    expect(data.tags).toEqual(['Prompt Engineering', 'AI Automation'])
  })

  it('falls back to catalog title when certificate title is empty', () => {
    const data = buildCertificatePreviewData({ courseTitle: 'Build with AI' })
    expect(data.courseTitle).toBe('Build with AI')
  })
})
