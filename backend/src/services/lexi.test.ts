import { describe, expect, it } from 'vitest'
import { buildLessonContextBlock, LEXI_SYSTEM_PROMPT } from './lexi.service.js'

describe('buildLessonContextBlock', () => {
  const base = { lessonLabel: 'Lesson 3', stepIndex: 2, stepCount: 7 }

  it('reports the step as 1-based for the model', () => {
    // stepIndex is 0-based internally; printing it raw would tell the learner
    // they are on step 2 of 7 while the UI shows 3.
    expect(buildLessonContextBlock(base)).toContain('Step: 3 of 7')
  })

  it('includes the module label only when known', () => {
    expect(buildLessonContextBlock({ ...base, moduleLabel: 'Module 1' })).toContain(
      'CURRENT LESSON: Lesson 3 (Module 1)'
    )
    // The widget cannot resolve the module on every lesson, so an empty
    // parenthesis pair must never appear.
    expect(buildLessonContextBlock(base)).toContain('CURRENT LESSON: Lesson 3')
    expect(buildLessonContextBlock(base)).not.toContain('()')
  })

  it('omits the lesson-content section when there is nothing to ground on', () => {
    expect(buildLessonContextBlock(base)).not.toContain('Lesson content:')
    expect(buildLessonContextBlock({ ...base, contentSummary: '   ' })).not.toContain(
      'Lesson content:'
    )
  })

  it('truncates lesson content to bound the prompt', () => {
    const block = buildLessonContextBlock({ ...base, contentSummary: 'x'.repeat(5000) })
    const body = block.split('Lesson content:\n')[1] ?? ''
    expect(body.length).toBeLessThanOrEqual(1800)
  })

  it('labels the learner profile as quiz data and tells the model not to read it back', () => {
    const block = buildLessonContextBlock({
      ...base,
      learnerBackground: '- Current work Business owner',
    })
    expect(block).toContain('LEARNER PROFILE')
    expect(block).toContain("don't read it back to them")
    expect(block).toContain('Business owner')
  })

  it('omits the profile section entirely when no background is known', () => {
    expect(buildLessonContextBlock(base)).not.toContain('LEARNER PROFILE')
    expect(buildLessonContextBlock({ ...base, learnerBackground: '  ' })).not.toContain(
      'LEARNER PROFILE'
    )
  })

  it('keeps the persona ahead of the volatile block', () => {
    // The stable persona must stay at the head of the prefix for OpenAI's
    // automatic prompt caching to hit across requests.
    expect(LEXI_SYSTEM_PROMPT.length).toBeGreaterThan(500)
    expect(buildLessonContextBlock(base)).not.toContain(LEXI_SYSTEM_PROMPT)
  })
})

describe('LEXI_SYSTEM_PROMPT', () => {
  it('routes support, billing and refunds to the human team', () => {
    expect(LEXI_SYSTEM_PROMPT).toContain('hello@appexme.com')
    expect(LEXI_SYSTEM_PROMPT).toContain('SUPPORT, COMPLAINTS, BILLING AND REFUNDS')
  })

  it('forbids stating refund terms', () => {
    // Code and the published policy disagree today, so any figure Lexi invents
    // is a consumer-law exposure rather than a cosmetic error.
    expect(LEXI_SYSTEM_PROMPT).toContain('NEVER state refund terms')
  })

  it('carries a crisis branch that overrides the course framing', () => {
    expect(LEXI_SYSTEM_PROMPT).toContain('IF SOMEONE IS IN DISTRESS')
    expect(LEXI_SYSTEM_PROMPT).toContain('do not steer them back to the lesson')
  })

  it('exempts support cases from the off-topic redirect', () => {
    // Without the carve-out the "redirect anything unrelated" rule would fight
    // the support instructions and send refund questions back to the lesson.
    expect(LEXI_SYSTEM_PROMPT).toContain('This does not apply to the SUPPORT cases below')
  })
})
