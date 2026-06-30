import { supabaseAdmin } from '../db/supabase.js'
import { AppError } from '../utils/error-handler.js'

export type QuizBlockMode = 'single' | 'multi' | 'open'

export interface QuizRevealMeta {
  mode: QuizBlockMode
  explanation: string | null
  correctIndices: number[]
}

export interface SavedQuizAttempt {
  stepIndex: number
  blockIndex: number
  selectedIndices: number[]
  openAnswer: string | null
  correct: boolean
  explanation: string | null
  correctIndices: number[]
}

/**
 * Resolves quiz interaction mode from unified or legacy lesson block shapes.
 */
export function getQuizBlockMode(block: unknown): QuizBlockMode | null {
  if (!block || typeof block !== 'object' || !('type' in block)) return null
  const t = (block as { type: string }).type
  const rawMode =
    t === 'quiz' ? (block as { mode?: string }).mode : undefined
  if (typeof rawMode === 'string') {
    if (rawMode === 'single' || rawMode === 'multi' || rawMode === 'open') return rawMode
    return null
  }
  if (t === 'quiz-single') return 'single'
  if (t === 'quiz-multi') return 'multi'
  return null
}

/**
 * Returns learner-safe reveal metadata for a checked quiz (correct indices + explanation).
 */
export function getQuizRevealMeta(block: unknown): QuizRevealMeta | null {
  const mode = getQuizBlockMode(block)
  if (!mode) return null

  if (mode === 'open') {
    const explanation = (block as { explanation?: string }).explanation
    return {
      mode,
      explanation: explanation ?? null,
      correctIndices: [],
    }
  }

  if (mode === 'single') {
    const b = block as { correctIndex: number; explanation?: string }
    return {
      mode,
      explanation: b.explanation ?? null,
      correctIndices: [b.correctIndex],
    }
  }

  const b = block as { correctIndices: number[]; explanation?: string }
  return {
    mode,
    explanation: b.explanation ?? null,
    correctIndices: b.correctIndices ?? [],
  }
}

/**
 * Grades a quiz submission against CMS block content (answers stay server-side).
 */
export function gradeQuizAnswer(
  block: unknown,
  input: { selectedIndices: number[]; openAnswer?: string }
): { isCorrect: boolean; meta: QuizRevealMeta } {
  const meta = getQuizRevealMeta(block)
  if (!meta) throw new AppError(400, 'Block is not a quiz')

  if (meta.mode === 'open') {
    const text = (input.openAnswer ?? '').trim()
    if (!text) throw new AppError(400, 'Please enter an answer')
    return { isCorrect: true, meta }
  }

  if (meta.mode === 'single') {
    const correctIndex = meta.correctIndices[0]
    const isCorrect =
      input.selectedIndices.length === 1 && input.selectedIndices[0] === correctIndex
    return { isCorrect, meta }
  }

  const want = new Set(meta.correctIndices)
  const got = new Set(input.selectedIndices)
  const isCorrect = want.size === got.size && [...want].every((x) => got.has(x))
  return { isCorrect, meta }
}

/**
 * Loads the latest saved quiz attempt per step/block for lesson resume UI.
 */
export async function loadLatestQuizAttemptsForUser(
  userId: string,
  lessonId: number,
  rawSteps: unknown
): Promise<SavedQuizAttempt[]> {
  const { data: rows, error } = await supabaseAdmin
    .from('lesson_quiz_attempts')
    .select('step_index, block_index, selected_indices, is_correct, open_response, created_at')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: false })

  if (error) throw new AppError(500, error.message)

  const steps = Array.isArray(rawSteps) ? rawSteps : []
  const latestByKey = new Map<string, (typeof rows)[number]>()

  for (const row of rows ?? []) {
    const key = `${row.step_index}:${row.block_index}`
    if (!latestByKey.has(key)) latestByKey.set(key, row)
  }

  const attempts: SavedQuizAttempt[] = []

  for (const row of latestByKey.values()) {
    const block = (steps[row.step_index] as { blocks?: unknown[] } | undefined)?.blocks?.[
      row.block_index
    ]
    const meta = getQuizRevealMeta(block)
    if (!meta) continue

    attempts.push({
      stepIndex: row.step_index,
      blockIndex: row.block_index,
      selectedIndices: row.selected_indices ?? [],
      openAnswer: row.open_response ?? null,
      correct: row.is_correct,
      explanation: meta.explanation,
      correctIndices: meta.correctIndices,
    })
  }

  return attempts
}
