import { describe, expect, it } from 'vitest'
import { swapAdjacentEntityIds, swapAdjacentIds } from './reorder-payloads'

describe('swapAdjacentIds', () => {
  it('returns null for empty list', () => {
    expect(swapAdjacentIds([], 0, 1)).toBeNull()
  })

  it('swaps down', () => {
    expect(swapAdjacentIds([10, 20, 30], 0, 1)).toEqual([20, 10, 30])
  })

  it('swaps up', () => {
    expect(swapAdjacentIds([10, 20, 30], 2, -1)).toEqual([10, 30, 20])
  })

  it('returns null when neighbor is out of range', () => {
    expect(swapAdjacentIds([1, 2], 0, -1)).toBeNull()
    expect(swapAdjacentIds([1, 2], 1, 1)).toBeNull()
  })
})

describe('swapAdjacentEntityIds', () => {
  it('maps ids from rows', () => {
    const rows = [{ id: 1 }, { id: 2 }]
    expect(swapAdjacentEntityIds(rows, 0, 1)).toEqual([2, 1])
  })
})
