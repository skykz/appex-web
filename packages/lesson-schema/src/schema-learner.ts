import { z } from 'zod'

import { imageSrcFlexible, urlOrPath } from './schema.js'

/**
 * Quiz block as delivered to learners after answer keys are stripped (GET lesson).
 * Align with `stripQuizAnswersFromSteps` in strip.ts.
 */
export const quizLearnerBlockSchema = z.union([
  z.object({
    type: z.literal('quiz'),
    mode: z.literal('single'),
    question: z.string(),
    options: z.array(z.string()),
  }),
  z.object({
    type: z.literal('quiz'),
    mode: z.literal('multi'),
    question: z.string(),
    options: z.array(z.string()),
  }),
  z.object({
    type: z.literal('quiz'),
    mode: z.literal('open'),
    question: z.string(),
  }),
  /** @deprecated Legacy stored shape */
  z.object({ type: z.literal('quiz-single'), question: z.string(), options: z.array(z.string()) }),
  /** @deprecated Legacy stored shape */
  z.object({ type: z.literal('quiz-multi'), question: z.string(), options: z.array(z.string()) }),
])

/** Block union for the learner app renderer (no CMS-only fields). */
export const lessonBlockLearnerSchema = z.union([
  z.object({ type: z.literal('text'), content: z.string() }),
  z.object({ type: z.literal('bold-text'), content: z.string() }),
  z.object({ type: z.literal('heading'), content: z.string() }),
  z.object({ type: z.literal('image'), src: imageSrcFlexible, alt: z.string().optional() }),
  z.object({
    type: z.literal('video'),
    src: urlOrPath,
    title: z.string().max(200).optional(),
    caption: z.string().max(500).optional(),
  }),
  z.object({
    type: z.literal('file'),
    url: urlOrPath,
    label: z.string(),
    description: z.string().optional(),
  }),
  quizLearnerBlockSchema,
  z.object({
    type: z.literal('submission'),
    prompt: z.string(),
    acceptAttachment: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('callout'),
    variant: z.enum(['tip', 'note', 'warn']),
    title: z.string().optional(),
    content: z.string(),
  }),
  z.object({ type: z.literal('list'), items: z.array(z.string()) }),
  z.object({ type: z.literal('user-message'), name: z.string(), text: z.string() }),
  z.object({ type: z.literal('mentor-message'), text: z.string() }),
])

export const lessonStepLearnerSchema = z.object({
  blocks: z.array(lessonBlockLearnerSchema),
})

export type LessonBlockLearner = z.infer<typeof lessonBlockLearnerSchema>
export type LessonStepLearner = z.infer<typeof lessonStepLearnerSchema>
