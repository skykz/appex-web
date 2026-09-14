import { describe, expect, it } from 'vitest'
import { lessonBlockSchema, lessonBlockLearnerSchema, normalizeLessonContentSteps, stripQuizAnswersFromSteps } from '@appex/lesson-schema'

const parts = [
  { type: 'text', content: '**Before** and ""italic""' },
  { type: 'image', src: '/first.png', alt: 'First image' },
  { type: 'text', content: 'Between images\nSecond line' },
  { type: 'image', src: 'https://example.com/second.png' },
  { type: 'text', content: 'After both images' },
]
const guide = { type: 'guide', steps: [{ title: 'First', blocks: parts }, { title: 'Second', content: 'Legacy text' }] }

describe('guide step content', () => {
  it('preserves mixed text and multiple images through save and learner serialization', () => {
    const saved = lessonBlockSchema.parse(guide)
    const delivered = stripQuizAnswersFromSteps([{ blocks: [saved] }]) as Array<{ blocks: unknown[] }>
    expect(lessonBlockLearnerSchema.parse(delivered[0].blocks[0])).toEqual(guide)
  })

  it('converts legacy text into an editable section without losing formatting or newlines', () => {
    const legacy = { type: 'guide', steps: [{ title: 'Old', content: '**Text**\n""More""' }] }
    const normalized = normalizeLessonContentSteps([{ blocks: [legacy, guide] }])
    expect(normalized[0].blocks[0]).toEqual({ type: 'guide', steps: [{ title: 'Old', blocks: [{ type: 'text', content: '**Text**\n""More""' }] }] })
    expect(normalized[0].blocks[1]).toMatchObject({ steps: [{ blocks: parts }, { blocks: [{ type: 'text', content: 'Legacy text' }] }] })
  })

  it('allows image-only steps and rejects empty sections or invalid image sources', () => {
    const withParts = (blocks: unknown[]) => ({ ...guide, steps: [{ title: 'First', blocks }, guide.steps[1]] })
    expect(lessonBlockSchema.safeParse(withParts([{ type: 'image', src: '/image.png' }])).success).toBe(true)
    for (const blocks of [[], [{ type: 'text', content: '  ' }], [{ type: 'image', src: '' }]]) {
      expect(lessonBlockSchema.safeParse(withParts(blocks)).success).toBe(false)
    }
  })
})
