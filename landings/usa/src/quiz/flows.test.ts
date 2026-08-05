import { describe, it, expect } from 'vitest'
import {
  CLAUDE_AUTOMATION_FLOW,
  BUILTIN_FLOWS,
  DEFAULT_FLOW,
  indexOfStep,
  stepIdAt,
  checkpointAt,
} from './flows'
import { OVERLAY_QUIZ_STEPS } from '@/lib/overlay-quiz-steps'
import { STEP_COMPONENTS_BY_ID } from './QuizOverlay'

/**
 * These guard the one thing that must never break: the built-in flow has to
 * reproduce the live quiz exactly. A reordering here silently ships a different
 * funnel to paid traffic, so it is asserted, not trusted.
 */
describe('CLAUDE_AUTOMATION_FLOW parity with the live step taxonomy', () => {
  it('matches OVERLAY_QUIZ_STEPS 1:1 in order and id', () => {
    const taxonomy = Object.keys(OVERLAY_QUIZ_STEPS)
      .map(Number)
      .sort((a, b) => a - b)
      .map((i) => OVERLAY_QUIZ_STEPS[i].id)

    const flowIds = CLAUDE_AUTOMATION_FLOW.steps.map((s) => s.stepId)

    // Same length (the wheel, step 34, is intentionally not a flow step).
    expect(flowIds.length).toBe(taxonomy.length)
    expect(flowIds).toEqual(taxonomy)
  })

  it('every flow step_id is unique', () => {
    const ids = CLAUDE_AUTOMATION_FLOW.steps.map((s) => s.stepId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('places the checkpoints on the expected screens', () => {
    expect(checkpointAt(CLAUDE_AUTOMATION_FLOW, 'experience_with_claude')).toBe('entry')
    expect(checkpointAt(CLAUDE_AUTOMATION_FLOW, 'main_goal')).toBe('profiled')
    expect(checkpointAt(CLAUDE_AUTOMATION_FLOW, 'ai_experience_rating')).toBe('pain_established')
    expect(checkpointAt(CLAUDE_AUTOMATION_FLOW, 'commit_gate')).toBe('committed')
    expect(checkpointAt(CLAUDE_AUTOMATION_FLOW, 'email_capture')).toBe('email_captured')
    expect(checkpointAt(CLAUDE_AUTOMATION_FLOW, 'plan_reveal')).toBe('plan_revealed')
    // A non-checkpoint screen has none.
    expect(checkpointAt(CLAUDE_AUTOMATION_FLOW, 'info_2')).toBeUndefined()
  })

  it('reaches each checkpoint exactly once', () => {
    const seen = CLAUDE_AUTOMATION_FLOW.steps
      .map((s) => s.checkpoint)
      .filter(Boolean) as string[]
    expect(new Set(seen).size).toBe(seen.length)
  })
})

describe('every BUILTIN flow is fully renderable', () => {
  // The engine falls back to the default flow if ANY step_id isn't in the
  // component registry — which would silently mask a typo'd flow. Assert instead.
  for (const [version, flow] of Object.entries(BUILTIN_FLOWS)) {
    it(`${version}: every step_id has a registered component`, () => {
      const missing = flow.steps
        .map((s) => s.stepId)
        .filter((id) => !STEP_COMPONENTS_BY_ID[id])
      expect(missing).toEqual([])
    })
  }
})

describe('flow position helpers', () => {
  it('indexOfStep is 0-based and -1 for unknown', () => {
    expect(indexOfStep(DEFAULT_FLOW, 'experience_with_claude')).toBe(0)
    expect(indexOfStep(DEFAULT_FLOW, 'main_goal')).toBe(6)
    expect(indexOfStep(DEFAULT_FLOW, 'nope')).toBe(-1)
  })

  it('stepIdAt clamps out-of-range indices into the flow', () => {
    expect(stepIdAt(DEFAULT_FLOW, 0)).toBe('experience_with_claude')
    // Negative and past-end both clamp rather than returning undefined.
    expect(stepIdAt(DEFAULT_FLOW, -5)).toBe('experience_with_claude')
    expect(stepIdAt(DEFAULT_FLOW, 999)).toBe(
      DEFAULT_FLOW.steps[DEFAULT_FLOW.steps.length - 1].stepId
    )
  })

  it('the 1-based cursor maps to the same step_id the legacy STEPS index would', () => {
    // The overlay renders STEPS[step] (1-based). flows.ts is 0-based. For every
    // live step index, stepIdAt(flow, step-1) must equal the taxonomy id — this
    // is the exact translation the render path relies on.
    for (const [indexStr, meta] of Object.entries(OVERLAY_QUIZ_STEPS)) {
      const step = Number(indexStr)
      expect(stepIdAt(DEFAULT_FLOW, step - 1)).toBe(meta.id)
    }
  })
})
