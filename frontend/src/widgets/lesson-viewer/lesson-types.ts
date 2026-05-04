/**
 * Lesson content types for the learner app (`GET /api/lessons/:id` after quiz answers are stripped).
 * CMS/storage contracts live in `@appex/lesson-schema` (`LessonBlock`, `LessonStep`).
 */

import type { LessonBlockLearner, LessonStepLearner } from '@appex/lesson-schema'

export type LessonBlock = LessonBlockLearner
export type LessonStep = LessonStepLearner

export interface LessonContent {
  lessonId: number
  steps: LessonStep[]
}

const PLACEHOLDER_STEP: LessonStep = {
  blocks: [
    {
      type: 'text',
      content:
        'This lesson has no content yet. Your instructor can add steps in the admin console.',
    },
  ],
}

/**
 * Builds viewer-ready lesson content from API `steps` and normalizes empty payloads.
 */
export function buildLessonContentFromApi(
  lessonId: number,
  steps: LessonStep[] | null | undefined
): LessonContent {
  const normalized =
    Array.isArray(steps) && steps.length > 0
      ? steps.filter((s) => s?.blocks?.length)
      : []
  return {
    lessonId,
    steps: normalized.length > 0 ? normalized : [PLACEHOLDER_STEP],
  }
}
