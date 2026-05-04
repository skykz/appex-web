/**
 * Pure helpers for building reorder API payloads (full permutations).
 * Admin reorder endpoints require every sibling id in one shot; these utilities only swap neighbors.
 */

/**
 * Returns a new id list after swapping the element at `index` with `index + direction`.
 * @returns `null` when the move is out of range or `ids` is empty.
 */
export function swapAdjacentIds(
  ids: readonly number[],
  index: number,
  direction: -1 | 1
): number[] | null {
  if (ids.length === 0) return null
  const j = index + direction
  if (index < 0 || j < 0 || j >= ids.length) return null
  const next = [...ids]
  const tmp = next[index]!
  next[index] = next[j]!
  next[j] = tmp
  return next
}

/**
 * Same as {@link swapAdjacentIds} but derives ids from ordered rows with an `id` field.
 */
export function swapAdjacentEntityIds<T extends { id: number }>(
  rows: readonly T[],
  index: number,
  direction: -1 | 1
): number[] | null {
  return swapAdjacentIds(
    rows.map((r) => r.id),
    index,
    direction
  )
}
