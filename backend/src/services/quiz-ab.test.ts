import { describe, expect, it } from 'vitest'
import { pickArm } from './quiz-ab.js'

const arms = [
  { bucket: 'control', weight: 1 },
  { bucket: 'variant', weight: 1 },
]

describe('pickArm', () => {
  it('is deterministic: same visitor + funnel → same arm every time', () => {
    const a = pickArm(arms, 'anon-123', 'excel_hook')
    const b = pickArm(arms, 'anon-123', 'excel_hook')
    expect(a.bucket).toBe(b.bucket)
  })

  it('a single arm always wins regardless of visitor', () => {
    const solo = [{ bucket: 'control', weight: 1 }]
    expect(pickArm(solo, 'x', 'f').bucket).toBe('control')
    expect(pickArm(solo, 'y', 'f').bucket).toBe('control')
  })

  it('excludes zero-weight (paused) arms from new traffic', () => {
    const paused = [
      { bucket: 'control', weight: 1 },
      { bucket: 'paused', weight: 0 },
    ]
    for (let i = 0; i < 200; i++) {
      expect(pickArm(paused, `visitor-${i}`, 'f').bucket).toBe('control')
    }
  })

  it('falls back to the first arm when all weights are zero', () => {
    const allZero = [
      { bucket: 'a', weight: 0 },
      { bucket: 'b', weight: 0 },
    ]
    expect(pickArm(allZero, 'x', 'f').bucket).toBe('a')
  })

  it('splits a population roughly by weight', () => {
    // 90/10 split: with a good hash, ~10% should land in the 10-weight arm.
    const split = [
      { bucket: 'big', weight: 90 },
      { bucket: 'small', weight: 10 },
    ]
    const N = 5000
    let small = 0
    for (let i = 0; i < N; i++) {
      if (pickArm(split, `user-${i}`, 'test').bucket === 'small') small++
    }
    const ratio = small / N
    // Wide tolerance — this asserts "not broken", not statistical precision.
    expect(ratio).toBeGreaterThan(0.06)
    expect(ratio).toBeLessThan(0.14)
  })

  it('salts by funnel: the same visitor can differ across two tests', () => {
    // Not guaranteed to differ for any one visitor, but across many, the arm
    // assignment for funnel A must not be identical to funnel B.
    let differ = 0
    for (let i = 0; i < 200; i++) {
      const id = `person-${i}`
      if (pickArm(arms, id, 'funnel_a').bucket !== pickArm(arms, id, 'funnel_b').bucket) {
        differ++
      }
    }
    expect(differ).toBeGreaterThan(0)
  })
})
