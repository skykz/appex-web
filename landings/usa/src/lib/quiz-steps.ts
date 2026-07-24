/**
 * Step taxonomy for the USA quiz funnel analytics (`quiz_step` / `quiz_answer`).
 *
 * The spec asks for a `step_index` / `step_id` / `section` / `type` on every quiz
 * screen so the drop-off funnel can be built by descending `step_index`. This map
 * is keyed to the ACTUAL 45 screens in QuizFlow.tsx `stepComponents` (1-based
 * index === position there) — the code's quiz differs from the spec's ~40-screen
 * draft, so slugs follow the real screens/answer keys, not the draft.
 *
 * `type`:
 *   - "question"     — collects an answer (has an answerKey)
 *   - "info"         — interstitial / informational screen (no answer)
 *   - "milestone"    — email / name / final plan (special funnel points)
 *
 * `answerKey` links a question screen to its field in QuizAnswers, so `quiz_answer`
 * can report which value was chosen.
 */

export type QuizStepType = 'question' | 'info' | 'milestone'

export type QuizStepMeta = {
  /** 1-based position, matches QuizFlow stepComponents index. */
  index: number
  /** Stable slug used as `step_id` in analytics. */
  id: string
  /** Funnel section for grouping in reports. */
  section: 'profile' | 'pain' | 'goals' | 'plan' | 'signup'
  type: QuizStepType
  /** QuizAnswers field this screen sets (question screens only). */
  answerKey?: string
}

/**
 * Ordered to match QuizFlow.tsx `stepComponents` exactly (index 1 = first entry).
 * Keep in sync if the step order there changes.
 */
export const QUIZ_STEPS: QuizStepMeta[] = [
  { index: 1, id: 'age', section: 'profile', type: 'question', answerKey: 'age' },
  { index: 2, id: 'goal', section: 'goals', type: 'question', answerKey: 'goal' },
  { index: 3, id: 'income_goal', section: 'goals', type: 'question', answerKey: 'incomeGoal' },
  { index: 4, id: 'reason_goal', section: 'goals', type: 'question', answerKey: 'reasonForMoney' },
  { index: 5, id: 'describe', section: 'profile', type: 'question', answerKey: 'describe' },
  { index: 6, id: 'challenges', section: 'pain', type: 'question', answerKey: 'challenges' },
  { index: 7, id: 'info_1', section: 'pain', type: 'info' },
  { index: 8, id: 'experience', section: 'profile', type: 'question', answerKey: 'experience' },
  { index: 9, id: 'stopping_you', section: 'pain', type: 'question', answerKey: 'stoppingYou' },
  { index: 10, id: 'ai_feeling', section: 'pain', type: 'question', answerKey: 'aiFeeling' },
  { index: 11, id: 'frustration', section: 'pain', type: 'question', answerKey: 'frustration' },
  { index: 12, id: 'coding', section: 'profile', type: 'question', answerKey: 'codingExperience' },
  { index: 13, id: 'info_2', section: 'pain', type: 'info' },
  { index: 14, id: 'social_proof', section: 'pain', type: 'info' },
  { index: 15, id: 'financial_satisfaction', section: 'goals', type: 'question', answerKey: 'financialSatisfaction' },
  { index: 16, id: 'extra_income', section: 'goals', type: 'question', answerKey: 'extraIncomeThinking' },
  { index: 17, id: 'info_3', section: 'goals', type: 'info' },
  { index: 18, id: 'work_environment', section: 'profile', type: 'question', answerKey: 'workEnvironment' },
  { index: 19, id: 'current_hours', section: 'profile', type: 'question', answerKey: 'currentHours' },
  { index: 20, id: 'preferred_hours', section: 'goals', type: 'question', answerKey: 'preferredHours' },
  { index: 21, id: 'social_media', section: 'profile', type: 'question', answerKey: 'socialMediaHours' },
  { index: 22, id: 'info_4', section: 'goals', type: 'info' },
  { index: 23, id: 'exciting_ai', section: 'goals', type: 'question', answerKey: 'excitingAboutAI' },
  { index: 24, id: 'ai_tools_familiar', section: 'profile', type: 'question', answerKey: 'aiToolsFamiliar' },
  { index: 25, id: 'free_access', section: 'goals', type: 'question', answerKey: 'freeAccessKnowledge' },
  { index: 26, id: 'info_5', section: 'goals', type: 'info' },
  { index: 27, id: 'try_tech_skill', section: 'goals', type: 'question', answerKey: 'tryTechSkill' },
  { index: 28, id: 'ai_automation', section: 'goals', type: 'question', answerKey: 'aiAutomationKnowledge' },
  { index: 29, id: 'info_6', section: 'goals', type: 'info' },
  { index: 30, id: 'info_7', section: 'goals', type: 'info' },
  { index: 31, id: 'info_8', section: 'goals', type: 'info' },
  { index: 32, id: 'info_9', section: 'goals', type: 'info' },
  { index: 33, id: 'finding_clients', section: 'goals', type: 'question', answerKey: 'findingClients' },
  { index: 34, id: 'info_10', section: 'goals', type: 'info' },
  { index: 35, id: 'price_input', section: 'goals', type: 'question', answerKey: 'priceFeeling' },
  { index: 36, id: 'career_goal', section: 'goals', type: 'question', answerKey: 'career_goal' },
  { index: 37, id: 'time_horizon', section: 'goals', type: 'question', answerKey: 'time_horizon' },
  { index: 38, id: 'income_profile', section: 'plan', type: 'info' },
  { index: 39, id: 'goal_amount', section: 'goals', type: 'question', answerKey: 'goalAmount' },
  { index: 40, id: 'goal_time', section: 'goals', type: 'question', answerKey: 'goalTime' },
  { index: 41, id: 'growth_chart', section: 'plan', type: 'info' },
  { index: 42, id: 'loading', section: 'plan', type: 'info' },
  { index: 43, id: 'email', section: 'signup', type: 'milestone', answerKey: 'email' },
  { index: 44, id: 'name', section: 'signup', type: 'milestone', answerKey: 'userName' },
  { index: 45, id: 'plan_reveal', section: 'plan', type: 'milestone' },
]

/** Total number of quiz screens (mirrors QuizContext TOTAL_STEPS). */
export const QUIZ_STEP_COUNT = QUIZ_STEPS.length

/** Looks up step metadata by 1-based index; null if out of range. */
export function stepByIndex(index: number): QuizStepMeta | null {
  return QUIZ_STEPS[index - 1] ?? null
}

/** Maps a QuizAnswers field back to its step_id (for quiz_answer). */
export function stepIdForAnswerKey(answerKey: string): string | null {
  return QUIZ_STEPS.find((s) => s.answerKey === answerKey)?.id ?? null
}
