import { describe, expect, it } from 'vitest'
import { parseLessonInlineMarkdown } from '@appex/lesson-schema'

describe('parseLessonInlineMarkdown', () => {
  it('parses bold spans', () => {
    expect(parseLessonInlineMarkdown('focus on **behavioral drivers** here')).toEqual([
      { kind: 'text', value: 'focus on ' },
      { kind: 'bold', value: 'behavioral drivers' },
      { kind: 'text', value: ' here' },
    ])
  })

  it('parses list-style labels', () => {
    expect(parseLessonInlineMarkdown('**The Goal:** When they see a new tool')).toEqual([
      { kind: 'bold', value: 'The Goal:' },
      { kind: 'text', value: ' When they see a new tool' },
    ])
  })

  it('parses URLs and bold in the same line', () => {
    expect(parseLessonInlineMarkdown('See **docs** at https://appex.kz, ok')).toEqual([
      { kind: 'text', value: 'See ' },
      { kind: 'bold', value: 'docs' },
      { kind: 'text', value: ' at ' },
      { kind: 'link', href: 'https://appex.kz', label: 'https://appex.kz' },
      { kind: 'text', value: ',' },
      { kind: 'text', value: ' ok' },
    ])
  })
})
