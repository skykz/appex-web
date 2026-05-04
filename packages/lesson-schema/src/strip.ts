/**
 * Removes quiz answer keys from lesson JSON before sending to learners (prevents cheating).
 *
 * @param steps Lesson `content` steps from the database.
 * @returns A deep-cloned shape with `correctIndex`, `correctIndices`, and `explanation` removed for quiz blocks.
 */
export function stripQuizAnswersFromSteps(steps: unknown): unknown {
  if (!Array.isArray(steps)) return steps
  return steps.map((step) => {
    if (!step || typeof step !== 'object' || !('blocks' in step)) return step
    const blocks = (step as { blocks: unknown[] }).blocks
    if (!Array.isArray(blocks)) return step
    return {
      ...step,
      blocks: blocks.map((b) => {
        if (!b || typeof b !== 'object' || !('type' in b)) return b
        const t = (b as { type: string }).type
        if (t === 'quiz-single') {
          const { correctIndex: _a, explanation: _e, ...rest } = b as Record<string, unknown>
          return rest
        }
        if (t === 'quiz-multi') {
          const { correctIndices: _c, explanation: _e, ...rest } = b as Record<string, unknown>
          return rest
        }
        if (t === 'quiz') {
          const x = b as Record<string, unknown>
          const { correctIndex: _ci, correctIndices: _cis, explanation: _e, ...rest } = x
          return rest
        }
        return b
      }),
    }
  })
}
