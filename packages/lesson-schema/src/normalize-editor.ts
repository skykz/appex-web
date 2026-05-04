import type { LessonBlock } from './schema.js'

type RawLessonBlock = { type: string; [key: string]: unknown }

/**
 * Maps one raw API/database block into the editor model (legacy quiz + defaults).
 */
export function normalizeLessonBlockForEditor(b: RawLessonBlock): LessonBlock {
  if (b.type === 'quiz-single') {
    return {
      type: 'quiz',
      mode: 'single',
      question: String(b.question ?? ''),
      options: Array.isArray(b.options) ? b.options.map((x) => String(x)) : ['', ''],
      correctIndex:
        typeof b.correctIndex === 'number' && Number.isFinite(b.correctIndex)
          ? b.correctIndex
          : Number(b.correctIndex) || 0,
      explanation: b.explanation != null ? String(b.explanation) : undefined,
    }
  }
  if (b.type === 'quiz-multi') {
    const raw = Array.isArray(b.correctIndices)
      ? b.correctIndices.map((x) => Number(x)).filter((n) => Number.isFinite(n))
      : []
    return {
      type: 'quiz',
      mode: 'multi',
      question: String(b.question ?? ''),
      options: Array.isArray(b.options) ? b.options.map((x) => String(x)) : ['', ''],
      correctIndices: raw.length > 0 ? raw : [0],
      explanation: b.explanation != null ? String(b.explanation) : undefined,
    }
  }
  if (b.type === 'quiz') {
    const mode = b.mode === 'multi' ? 'multi' : b.mode === 'open' ? 'open' : 'single'
    if (mode === 'open') {
      return {
        type: 'quiz',
        mode: 'open',
        question: String(b.question ?? ''),
        explanation: b.explanation != null ? String(b.explanation) : undefined,
      }
    }
    if (mode === 'multi') {
      const raw = Array.isArray(b.correctIndices)
        ? b.correctIndices.map((x) => Number(x)).filter((n) => Number.isFinite(n))
        : [0]
      return {
        type: 'quiz',
        mode: 'multi',
        question: String(b.question ?? ''),
        options: Array.isArray(b.options) ? b.options.map((x) => String(x)) : ['', ''],
        correctIndices: raw.length > 0 ? raw : [0],
        explanation: b.explanation != null ? String(b.explanation) : undefined,
      }
    }
    return {
      type: 'quiz',
      mode: 'single',
      question: String(b.question ?? ''),
      options: Array.isArray(b.options) ? b.options.map((x) => String(x)) : ['', ''],
      correctIndex:
        typeof b.correctIndex === 'number' && Number.isFinite(b.correctIndex) ? b.correctIndex : 0,
      explanation: b.explanation != null ? String(b.explanation) : undefined,
    }
  }
  return b as LessonBlock
}

/**
 * Normalizes full lesson `content` steps for the admin editor (legacy quiz rows + defaults).
 * Returns an empty array when `content` is missing or empty so callers can apply their own default step.
 */
export function normalizeLessonContentSteps(
  content: unknown
): Array<{ blocks: LessonBlock[] }> {
  if (!Array.isArray(content) || content.length === 0) return []
  return content.map((step) => ({
    blocks: (step?.blocks ?? []).map((block: unknown) =>
      normalizeLessonBlockForEditor(block as RawLessonBlock)
    ),
  }))
}
