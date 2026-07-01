/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest'
import { convertWordHtmlToLessonText } from './word-paste'

describe('convertWordHtmlToLessonText', () => {
  it('strips bold tags to plain text', () => {
    const html = '<p>Focus on <b>behavioral drivers</b> here.</p>'
    expect(convertWordHtmlToLessonText(html)).toBe('Focus on behavioral drivers here.')
  })

  it('strips Word span font-weight bold', () => {
    const html =
      '<p><span style="font-weight:bold">The Goal:</span> When they see a new tool.</p>'
    expect(convertWordHtmlToLessonText(html)).toBe('The Goal: When they see a new tool.')
  })

  it('strips italic tags to plain text', () => {
    const html = '<p>Send an <i>Email</i> today.</p>'
    expect(convertWordHtmlToLessonText(html)).toBe('Send an Email today.')
  })

  it('strips Word span font-style italic', () => {
    const html =
      '<p>Send an <span style="font-style:italic">Email</span> today.</p>'
    expect(convertWordHtmlToLessonText(html)).toBe('Send an Email today.')
  })

  it('strips bold and italic on the same span', () => {
    const html =
      '<p><span style="font-weight:bold;font-style:italic">Email</span></p>'
    expect(convertWordHtmlToLessonText(html)).toBe('Email')
  })

  it('strips Word mso-ansi emphasis spans', () => {
    const html =
      '<p><span style="mso-ansi-font-weight:bold">Goal</span> and <span style="mso-ansi-font-style:italic">Email</span></p>'
    expect(convertWordHtmlToLessonText(html)).toBe('Goal and Email')
  })

  it('strips emphasis from Word stylesheet classes', () => {
    const html = `
      <html>
        <head>
          <style>
            .LabelChar { mso-ansi-font-weight: bold; }
            .FieldChar { font-style: italic; }
          </style>
        </head>
        <body>
          <p><span class="LabelChar">Goal:</span> send <span class="FieldChar">Email</span></p>
        </body>
      </html>
    `
    expect(convertWordHtmlToLessonText(html)).toBe('Goal: send Email')
  })

  it('handles Windows CF_HTML clipboard wrapper', () => {
    const html = `Version:1.0
StartHTML:00000097
EndHTML:00000220
StartFragment:00000137
EndFragment:00000184
<html><body><!--StartFragment--><p>Focus on <b>drivers</b> here.</p><!--EndFragment--></body></html>`
    expect(convertWordHtmlToLessonText(html)).toBe('Focus on drivers here.')
  })

  it('converts list items for list mode without emphasis markers', () => {
    const html =
      '<ul><li><b>The Goal:</b> First point</li><li><b>The Friction:</b> Second point</li></ul>'
    expect(convertWordHtmlToLessonText(html, 'list')).toBe(
      'The Goal: First point\nThe Friction: Second point'
    )
  })

  it('preserves paragraph breaks in text mode', () => {
    const html = '<p>First paragraph.</p><p>Second paragraph.</p>'
    expect(convertWordHtmlToLessonText(html)).toBe('First paragraph.\n\nSecond paragraph.')
  })
})
