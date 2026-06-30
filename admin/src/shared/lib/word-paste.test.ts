/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest'
import { convertWordHtmlToLessonText } from './word-paste'

describe('convertWordHtmlToLessonText', () => {
  it('converts bold tags to markdown', () => {
    const html = '<p>Focus on <b>behavioral drivers</b> here.</p>'
    expect(convertWordHtmlToLessonText(html)).toBe(
      'Focus on **behavioral drivers** here.'
    )
  })

  it('converts Word span font-weight bold', () => {
    const html =
      '<p><span style="font-weight:bold">The Goal:</span> When they see a new tool.</p>'
    expect(convertWordHtmlToLessonText(html)).toBe(
      '**The Goal:** When they see a new tool.'
    )
  })

  it('converts list items for list mode', () => {
    const html =
      '<ul><li><b>The Goal:</b> First point</li><li><b>The Friction:</b> Second point</li></ul>'
    expect(convertWordHtmlToLessonText(html, 'list')).toBe(
      '**The Goal:** First point\n**The Friction:** Second point'
    )
  })

  it('preserves paragraph breaks in text mode', () => {
    const html = '<p>First paragraph.</p><p>Second paragraph.</p>'
    expect(convertWordHtmlToLessonText(html)).toBe('First paragraph.\n\nSecond paragraph.')
  })
})
