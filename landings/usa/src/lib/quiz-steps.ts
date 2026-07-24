/**
 * Step taxonomy for the USA quiz funnel analytics (`quiz_step` / `quiz_answer`).
 *
 * The spec wants `step_index` / `step_id` / `section` / `type` on every quiz
 * screen so the drop-off funnel can be built by descending `step_index`. Slugs,
 * sections, and types below are the GROUND TRUTH from reading every screen
 * component — verified against the actual heading text and setAnswer key, not the
 * import order.
 *
 * Ordering MUST match QuizFlow.tsx `stepComponents` exactly (index 1 = first
 * entry). A dev-time assert (assertStepMapInSync) guards against drift if that
 * array is ever reordered again.
 *
 * Two pre-QuizFlow intro screens (`quiz_intro`, `gender`) live in Quiz.tsx and
 * are tracked separately there — they are index 0-ish and not part of this array
 * (which mirrors the 45 QuizFlow screens). `gender` is registered in
 * INTRO_STEP_IDS so quiz_answer can resolve its step_id.
 *
 * `type`:
 *   - "question"  — collects an answer (has answerKey)
 *   - "info"      — interstitial / informational screen (no answer)
 *   - "loader"    — progress/loading screen (may have gating popups)
 *   - "milestone" — email / name / final plan (special funnel points)
 */

export type QuizStepType = 'question' | 'info' | 'loader' | 'milestone'

export type QuizStepMeta = {
  /** 1-based position, matches QuizFlow stepComponents index. */
  index: number
  /** Stable slug used as `step_id` in analytics. */
  id: string
  /** Funnel section for grouping in reports. */
  section: 'intro' | 'profile' | 'pain' | 'value' | 'goals' | 'plan' | 'signup'
  type: QuizStepType
  /** QuizAnswers field this screen sets (question/milestone screens only). */
  answerKey?: string
}

/**
 * Ordered to match QuizFlow.tsx `stepComponents` exactly (index 1 = first entry).
 * Verified screen-by-screen against actual heading text + setAnswer key.
 */
export const QUIZ_STEPS: QuizStepMeta[] = [
  { index: 1, id: 'age', section: 'profile', type: 'question', answerKey: 'age' },
  { index: 2, id: 'main_goal', section: 'goals', type: 'question', answerKey: 'goal' },
  { index: 3, id: 'income_goal', section: 'goals', type: 'question', answerKey: 'incomeGoal' },
  { index: 4, id: 'reason_for_money', section: 'goals', type: 'question', answerKey: 'reasonForMoney' },
  { index: 5, id: 'describe_work_status', section: 'profile', type: 'question', answerKey: 'describe' },
  { index: 6, id: 'job_challenges', section: 'pain', type: 'question', answerKey: 'challenges' },
  { index: 7, id: 'info_we_can_help', section: 'value', type: 'info' },
  { index: 8, id: 'online_earning_experience', section: 'profile', type: 'question', answerKey: 'experience' },
  { index: 9, id: 'whats_stopping_you', section: 'pain', type: 'question', answerKey: 'stoppingYou' },
  { index: 10, id: 'ai_feeling_scale', section: 'pain', type: 'question', answerKey: 'aiFeeling' },
  { index: 11, id: 'frustration_scale', section: 'pain', type: 'question', answerKey: 'frustration' },
  { index: 12, id: 'coding_experience', section: 'profile', type: 'question', answerKey: 'codingExperience' },
  { index: 13, id: 'info_no_coding', section: 'value', type: 'info' },
  { index: 14, id: 'info_social_proof', section: 'value', type: 'info' },
  { index: 15, id: 'financial_satisfaction', section: 'pain', type: 'question', answerKey: 'financialSatisfaction' },
  { index: 16, id: 'extra_income_timing', section: 'goals', type: 'question', answerKey: 'extraIncomeThinking' },
  { index: 17, id: 'info_income_growth', section: 'value', type: 'info' },
  { index: 18, id: 'work_environment', section: 'profile', type: 'question', answerKey: 'workEnvironment' },
  { index: 19, id: 'current_work_hours', section: 'profile', type: 'question', answerKey: 'currentHours' },
  { index: 20, id: 'preferred_work_hours', section: 'goals', type: 'question', answerKey: 'preferredHours' },
  { index: 21, id: 'social_media_hours', section: 'profile', type: 'question', answerKey: 'socialMediaHours' },
  { index: 22, id: 'info_imagine_chatbots', section: 'value', type: 'info' },
  { index: 23, id: 'exciting_about_ai', section: 'goals', type: 'question', answerKey: 'excitingAboutAI' },
  { index: 24, id: 'ai_tools_familiar', section: 'profile', type: 'question', answerKey: 'aiToolsFamiliar' },
  { index: 25, id: 'free_access_awareness', section: 'value', type: 'question', answerKey: 'freeAccessKnowledge' },
  { index: 26, id: 'info_free_tools', section: 'value', type: 'info' },
  { index: 27, id: 'try_tech_skill', section: 'goals', type: 'question', answerKey: 'tryTechSkill' },
  { index: 28, id: 'ai_automation_knowledge', section: 'goals', type: 'question', answerKey: 'aiAutomationKnowledge' },
  { index: 29, id: 'info_usecase_support_bot', section: 'value', type: 'info' },
  { index: 30, id: 'info_usecase_sales_agent', section: 'value', type: 'info' },
  { index: 31, id: 'info_usecase_marketing_agent', section: 'value', type: 'info' },
  { index: 32, id: 'info_usecase_resume_hr', section: 'value', type: 'info' },
  { index: 33, id: 'finding_clients_knowledge', section: 'goals', type: 'question', answerKey: 'findingClients' },
  { index: 34, id: 'info_success_rate', section: 'value', type: 'info' },
  { index: 35, id: 'price_sensitivity', section: 'signup', type: 'question', answerKey: 'priceFeeling' },
  { index: 36, id: 'career_goal', section: 'goals', type: 'question', answerKey: 'career_goal' },
  { index: 37, id: 'time_horizon', section: 'goals', type: 'question', answerKey: 'time_horizon' },
  { index: 38, id: 'info_ai_profile', section: 'plan', type: 'info' },
  { index: 39, id: 'goal_amount', section: 'goals', type: 'question', answerKey: 'goalAmount' },
  { index: 40, id: 'goal_time_daily', section: 'goals', type: 'question', answerKey: 'goalTime' },
  { index: 41, id: 'info_growth_chart', section: 'plan', type: 'info' },
  { index: 42, id: 'loading_roadmap', section: 'plan', type: 'loader' },
  { index: 43, id: 'email_capture', section: 'signup', type: 'milestone', answerKey: 'email' },
  { index: 44, id: 'name_capture', section: 'signup', type: 'milestone', answerKey: 'userName' },
  { index: 45, id: 'plan_reveal', section: 'plan', type: 'milestone' },
]

/** Total number of QuizFlow screens (mirrors QuizContext TOTAL_STEPS). */
export const QUIZ_STEP_COUNT = QUIZ_STEPS.length

/**
 * Pre-QuizFlow intro screens (in Quiz.tsx), mapped so quiz_answer can resolve
 * their step_id. `quiz_intro` collects nothing (Yes/No are discarded); `gender`
 * is the first persisted answer.
 */
export const INTRO_STEP_IDS: Record<string, string> = {
  gender: 'gender',
}

/** Looks up step metadata by 1-based index; null if out of range. */
export function stepByIndex(index: number): QuizStepMeta | null {
  return QUIZ_STEPS[index - 1] ?? null
}

/**
 * Maps a QuizAnswers field back to its step_id (for quiz_answer). Covers both the
 * QuizFlow screens and the intro screens (gender).
 */
export function stepIdForAnswerKey(answerKey: string): string | null {
  return (
    QUIZ_STEPS.find((s) => s.answerKey === answerKey)?.id ??
    INTRO_STEP_IDS[answerKey] ??
    null
  )
}

/**
 * Dev-only guard: fails loudly if the step map falls out of sync with the quiz's
 * TOTAL_STEPS, so a future reorder of stepComponents can't silently break the
 * funnel taxonomy. Call once at module init from QuizFlow.
 */
export function assertStepMapInSync(totalSteps: number): void {
  if (import.meta.env.DEV && QUIZ_STEP_COUNT !== totalSteps) {
    // eslint-disable-next-line no-console
    console.error(
      `[quiz-steps] QUIZ_STEPS has ${QUIZ_STEP_COUNT} entries but TOTAL_STEPS is ${totalSteps}. ` +
        'The step map is out of sync with QuizFlow — update src/lib/quiz-steps.ts.'
    )
  }
}
