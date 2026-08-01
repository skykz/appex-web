import { describe, expect, it } from 'vitest'
import { __testables } from './learner-profile.service.js'

const { humanizeValue, renderBlock, MAX_BACKGROUND_CHARS } = __testables

describe('humanizeValue', () => {
  const OPTIONS = { owner: 'Business owner', faster: 'Work faster' }

  it('prefers the quiz option label over the raw value', () => {
    expect(humanizeValue('owner', OPTIONS)).toBe('Business owner')
  })

  it('de-snake_cases a value with no matching label', () => {
    // Better a readable fallback than printing "earn_more" into the prompt.
    expect(humanizeValue('earn_more', {})).toBe('earn more')
  })

  it('passes through values that are already prose', () => {
    expect(humanizeValue('Build my own business', {})).toBe('Build my own business')
  })

  it('drops answers that carry no meaning on their own', () => {
    // These would otherwise render as "Gender: skip", which tells Lexi nothing
    // and burns prompt budget.
    expect(humanizeValue('skip', OPTIONS)).toBeNull()
    expect(humanizeValue('none', OPTIONS)).toBeNull()
    expect(humanizeValue('prefer_not_to_say', OPTIONS)).toBeNull()
  })

  it('drops empty and whitespace-only strings', () => {
    expect(humanizeValue('', OPTIONS)).toBeNull()
    expect(humanizeValue('   ', OPTIONS)).toBeNull()
  })

  it('joins arrays and skips their empty members', () => {
    expect(humanizeValue(['owner', 'faster'], OPTIONS)).toBe('Business owner, Work faster')
    expect(humanizeValue(['owner', 'skip'], OPTIONS)).toBe('Business owner')
    expect(humanizeValue(['skip', 'none'], OPTIONS)).toBeNull()
  })

  it('stringifies numbers and booleans', () => {
    expect(humanizeValue(3, {})).toBe('3')
    expect(humanizeValue(true, {})).toBe('true')
  })

  it('returns null for shapes it cannot read', () => {
    expect(humanizeValue(null, {})).toBeNull()
    expect(humanizeValue(undefined, {})).toBeNull()
    expect(humanizeValue({ nested: 1 }, {})).toBeNull()
  })
})

describe('renderBlock', () => {
  it('renders one dash-prefixed line per pair', () => {
    expect(renderBlock([['Current work', 'Business owner']])).toBe('- Current work Business owner')
  })

  it('returns null for no pairs, so the caller can omit the block entirely', () => {
    expect(renderBlock([])).toBeNull()
  })

  it('caps the output so one long answer cannot crowd out the lesson content', () => {
    // The block is injected into a system message ahead of the lesson text; an
    // unbounded answer would push that out of the prompt.
    const long: Array<[string, string]> = Array.from({ length: 50 }, (_, i) => [
      `Question number ${i} with a fairly long label`,
      'An answer that is also quite long so the cap is reached',
    ])
    const out = renderBlock(long)
    expect(out).not.toBeNull()
    expect(out!.length).toBeLessThanOrEqual(MAX_BACKGROUND_CHARS)
  })

  it('keeps whole lines when truncating rather than cutting mid-sentence', () => {
    const long: Array<[string, string]> = Array.from({ length: 50 }, (_, i) => [
      `Label ${i}`,
      'x'.repeat(60),
    ])
    const out = renderBlock(long)!
    for (const line of out.split('\n')) {
      expect(line).toMatch(/^- Label \d+ x+$/)
    }
  })

  it('drops the first pair when it alone exceeds the cap', () => {
    // Guard against emitting a half-truncated line: better to render nothing.
    const huge: Array<[string, string]> = [['Label', 'y'.repeat(MAX_BACKGROUND_CHARS + 100)]]
    expect(renderBlock(huge)).toBeNull()
  })
})
