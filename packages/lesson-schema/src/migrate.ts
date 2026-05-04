/**
 * Rewrites legacy `quiz-single` / `quiz-multi` blocks into unified `{ type: 'quiz', mode }` before validation.
 *
 * @param content Raw lesson `content` array from the admin API body.
 * @returns The same structure with legacy quiz `type` values normalized for Zod parsing.
 */
export function migrateLegacyQuizShapes(content: unknown): unknown {
  if (!Array.isArray(content)) return content
  return content.map((step) => {
    if (!step || typeof step !== 'object' || !('blocks' in step)) return step
    const blocks = (step as { blocks: unknown[] }).blocks
    if (!Array.isArray(blocks)) return step
    return {
      ...step,
      blocks: blocks.map((b) => {
        if (!b || typeof b !== 'object' || !('type' in b)) return b
        const t = (b as { type: string }).type
        if (t === 'quiz-single') {
          const x = b as Record<string, unknown>
          return {
            type: 'quiz',
            mode: 'single',
            question: x.question,
            options: x.options,
            correctIndex: x.correctIndex,
            explanation: x.explanation,
          }
        }
        if (t === 'quiz-multi') {
          const x = b as Record<string, unknown>
          return {
            type: 'quiz',
            mode: 'multi',
            question: x.question,
            options: x.options,
            correctIndices: x.correctIndices,
            explanation: x.explanation,
          }
        }
        return b
      }),
    }
  })
}
