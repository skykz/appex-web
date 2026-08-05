/**
 * Flow registry for the flexible quiz.
 *
 * WHY THIS EXISTS
 * The overlay renders a fixed array of bespoke React screens indexed by integer
 * (STEPS[step] in QuizOverlay.tsx). That is fine for ONE flow and impossible for
 * several: different creatives need different first screens and, for the video
 * studio, an entirely different set of questions. An integer index cannot say
 * "this creative's screen 1 is the Excel hook"; a step_id can.
 *
 * A flow here is an ordered list of step_ids. Rendering still uses the existing
 * components (this is the hybrid engine, not a rewrite) — a small registry maps
 * each step_id to the component that draws it. Navigation, progress, deep-links
 * and analytics all key off step_id and the flow's own length, so a flow of 40
 * screens and a flow of 12 both work without touching phaseInfo/TOTAL_STEPS.
 *
 * WHAT IT DELIBERATELY IS NOT
 * Not the content itself. Question wording still comes from loadRemoteQuiz /
 * published content; this only fixes the ORDER and the checkpoints. Keeping the
 * two apart means a copy change never risks reordering the funnel and vice versa.
 */

/**
 * Named funnel stages, shared with the backend (migration 042). These are the
 * ONLY sound way to compare creatives of different lengths: step position 12 is
 * a different question in each flow, but "reached email_captured" means the same
 * thing everywhere. Every flow tags its steps with these; reports group by them.
 */
export type Checkpoint =
  | 'entry'
  | 'profiled'
  | 'pain_established'
  | 'committed'
  | 'email_captured'
  | 'plan_revealed'

/** One screen in a flow. `stepId` is the join key across code, content and events. */
export interface FlowStep {
  /**
   * Stable slug. Must match a key in the render registry (overlay-blocks.ts) and,
   * where content is published, a step_id in quiz_content. Renaming one orphans
   * that screen's historical events, so it is treated as immutable once live.
   */
  stepId: string
  /**
   * Set only on the screen that first reaches a stage; left undefined on the
   * rest. A flow may reach a checkpoint on any screen — that is the point of
   * naming stages instead of counting steps.
   */
  checkpoint?: Checkpoint
}

export interface QuizFlow {
  /** Flow version label, e.g. "v1.0.0". Recorded on every event as flow_version. */
  version: string
  /** Product this flow sells; drives the post-purchase handoff. */
  productSlug: string
  /** Ordered screens. Index in this array is the step's position within the flow. */
  steps: FlowStep[]
}

/**
 * The built-in Claude-automation flow.
 *
 * This is the CURRENT live quiz, transcribed step-for-step from the STEPS array
 * (1..33) and OVERLAY_QUIZ_STEPS in overlay-quiz-steps.ts. Order and ids are
 * identical on purpose: swapping the engine to read this list must not change a
 * single screen a real visitor sees. Step 34 (the discount wheel) is a
 * paywall-funnel screen, not a quiz step, and stays out of the flow exactly as
 * QUIZ_COMPLETE_STEP=33 already draws that line.
 *
 * Checkpoints are placed at the first screen of each stage:
 *  - entry            : the opening question (was step 1)
 *  - profiled         : once role+age+goal are known (main_goal, was step 7)
 *  - pain_established : first pain question answered (ai_experience_rating, step 9)
 *  - committed        : the commit gate (was step 30)
 *  - email_captured   : email screen (was step 31)
 *  - plan_revealed    : the personal plan (was step 33)
 */
export const CLAUDE_AUTOMATION_FLOW: QuizFlow = {
  version: 'v1.0.0',
  productSlug: 'claude_automation',
  steps: [
    { stepId: 'experience_with_claude', checkpoint: 'entry' },
    { stepId: 'info_2' },
    { stepId: 'learning_intent' },
    { stepId: 'work_status' },
    { stepId: 'age_band' },
    { stepId: 'gender' },
    { stepId: 'main_goal', checkpoint: 'profiled' },
    { stepId: 'recap_profile' },
    { stepId: 'ai_experience_rating', checkpoint: 'pain_established' },
    { stepId: 'primary_fear' },
    { stepId: 'info_11' },
    { stepId: 'time_lost_files' },
    { stepId: 'ai_rework_experience' },
    { stepId: 'info_14' },
    { stepId: 'had_unbuilt_idea' },
    { stepId: 'belief_no_code' },
    { stepId: 'info_17' },
    { stepId: 'learning_pace' },
    { stepId: 'daily_time_commitment' },
    { stepId: 'learning_approach' },
    { stepId: 'include_portfolio' },
    { stepId: 'wants_mentor' },
    { stepId: 'info_23' },
    { stepId: 'certification_value' },
    { stepId: 'info_25' },
    { stepId: 'career_goal' },
    { stepId: 'time_horizon' },
    { stepId: 'goal_card' },
    { stepId: 'loading_roadmap' },
    { stepId: 'commit_gate', checkpoint: 'committed' },
    { stepId: 'email_capture', checkpoint: 'email_captured' },
    { stepId: 'name_capture' },
    { stepId: 'plan_reveal', checkpoint: 'plan_revealed' },
  ],
}

/**
 * All flows the client can render WITHOUT a network round-trip.
 *
 * Keyed by version. The built-in flow is always here so the funnel works with the
 * backend down — the same fallback discipline as loadRemoteQuiz. Additional flows
 * (excel hook, studio) are added here as their screens are built; until then a
 * creative pointing at a missing flow degrades to this default (see resolveFlow).
 */
export const BUILTIN_FLOWS: Record<string, QuizFlow> = {
  [CLAUDE_AUTOMATION_FLOW.version]: CLAUDE_AUTOMATION_FLOW,
}

/** The flow used when nothing else resolves. Never null — a blank quiz is worse. */
export const DEFAULT_FLOW = CLAUDE_AUTOMATION_FLOW

/** Look up a step's position (0-based) in a flow, or -1 if absent. */
export function indexOfStep(flow: QuizFlow, stepId: string): number {
  return flow.steps.findIndex((s) => s.stepId === stepId)
}

/** The step_id at a position, clamped into range. */
export function stepIdAt(flow: QuizFlow, index: number): string {
  const clamped = Math.max(0, Math.min(index, flow.steps.length - 1))
  return flow.steps[clamped]?.stepId ?? DEFAULT_FLOW.steps[0].stepId
}

/**
 * The checkpoint a step carries, if any. Used by the tracker to stamp `checkpoint`
 * on the step's events — the cross-creative comparison signal.
 */
export function checkpointAt(flow: QuizFlow, stepId: string): Checkpoint | undefined {
  return flow.steps.find((s) => s.stepId === stepId)?.checkpoint
}
