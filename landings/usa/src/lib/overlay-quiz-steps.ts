/**
 * Step taxonomy for the OVERLAY quiz (src/quiz/QuizOverlay.tsx) — the quiz that
 * real users actually take, since every landing CTA (`<a href="/quiz">`) is
 * intercepted by quiz/QuizContext and opens the overlay instead of navigating.
 *
 * Mirrors the `STEPS` registry in QuizOverlay.tsx (1..33). Slugs are derived from
 * each screen's component, so the drop-off funnel reads meaningfully in GA4.
 *
 * Note: the separate 45-step quiz at the /quiz route has its own map in
 * quiz-steps.ts. Both feed the same `quiz_step` / `quiz_answer` event names, so
 * report on them together with `quiz_variant` to tell them apart.
 */

export type OverlayStepType = 'question' | 'info' | 'loader' | 'milestone'

export type OverlayStepMeta = {
  id: string
  section: 'intro' | 'profile' | 'pain' | 'value' | 'goals' | 'plan' | 'signup'
  type: OverlayStepType
}

/**
 * step_index (1-based, matches QuizOverlay STEPS keys) → metadata.
 * Component names from the registry are noted so this stays auditable.
 */
export const OVERLAY_QUIZ_STEPS: Record<number, OverlayStepMeta> = {
  1: { id: 'experience_with_claude', section: 'intro', type: 'question' }, // S1
  2: { id: 'info_2', section: 'value', type: 'info' }, // S2
  3: { id: 'learning_intent', section: 'goals', type: 'question' }, // S3
  4: { id: 'work_status', section: 'profile', type: 'question' }, // S4
  5: { id: 'age_band', section: 'profile', type: 'question' }, // S5
  6: { id: 'gender', section: 'profile', type: 'question' }, // SGender
  7: { id: 'main_goal', section: 'goals', type: 'question' }, // S6
  8: { id: 'recap_profile', section: 'plan', type: 'info' }, // SRecap
  9: { id: 'ai_experience_rating', section: 'pain', type: 'question' }, // SAiRating
  10: { id: 'primary_fear', section: 'pain', type: 'question' }, // S7
  11: { id: 'info_11', section: 'value', type: 'info' }, // S8
  12: { id: 'time_lost_files', section: 'pain', type: 'question' }, // S9
  13: { id: 'ai_rework_experience', section: 'pain', type: 'question' }, // S10
  14: { id: 'info_14', section: 'value', type: 'info' }, // S11
  15: { id: 'had_unbuilt_idea', section: 'pain', type: 'question' }, // S12
  16: { id: 'belief_no_code', section: 'pain', type: 'question' }, // S13
  17: { id: 'info_17', section: 'value', type: 'info' }, // S14
  18: { id: 'learning_pace', section: 'goals', type: 'question' }, // SLearnPace
  19: { id: 'daily_time_commitment', section: 'goals', type: 'question' }, // S15
  20: { id: 'learning_approach', section: 'goals', type: 'question' }, // SApproach
  21: { id: 'include_portfolio', section: 'goals', type: 'question' }, // SPortfolio
  22: { id: 'wants_mentor', section: 'goals', type: 'question' }, // S16
  23: { id: 'info_23', section: 'value', type: 'info' }, // S17
  24: { id: 'certification_value', section: 'goals', type: 'question' }, // S18
  25: { id: 'info_25', section: 'value', type: 'info' }, // S19
  26: { id: 'career_goal', section: 'goals', type: 'question' }, // SCareerGoal
  27: { id: 'time_horizon', section: 'goals', type: 'question' }, // STimeHorizon
  28: { id: 'goal_card', section: 'plan', type: 'info' }, // SGoalCard
  29: { id: 'loading_roadmap', section: 'plan', type: 'loader' }, // SLoadingFlow
  30: { id: 'commit_gate', section: 'signup', type: 'question' }, // S22 (commit_income/commit_time)
  31: { id: 'email_capture', section: 'signup', type: 'milestone' }, // S23
  32: { id: 'name_capture', section: 'signup', type: 'milestone' }, // S24
  33: { id: 'plan_reveal', section: 'plan', type: 'milestone' }, // S25
}

/** Metadata for an overlay step index, with a safe fallback for unknown steps. */
export function overlayStepByIndex(index: number): OverlayStepMeta {
  return (
    OVERLAY_QUIZ_STEPS[index] ?? { id: `step_${index}`, section: 'goals', type: 'question' }
  )
}
