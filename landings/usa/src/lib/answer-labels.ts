/**
 * Human-readable labels for quiz answers.
 *
 * The quiz stores compact slugs — `main_goal: "earn_more"`, `primary_fear:
 * "replaced"`, `daily_time_commitment: "30min"` — because those are the values
 * analytics groups by. The paywall needs the wording instead.
 *
 * Without this, the paywall's personalization block (directly above the pricing
 * cards, the highest-intent moment of the funnel) renders raw slugs like
 * "earn_more" back at the user.
 *
 * These maps mirror the CORE answer keys, which every product's flow is expected
 * to collect under the same names. Per-flow questions carry their label in the
 * flow content itself and don't belong here.
 */

/** `main_goal` — "How would learning Claude benefit you?" */
const GOAL_LABELS: Record<string, string> = {
  promotion: 'Get a promotion or a better job',
  faster: 'Work faster',
  confidence: 'Feel more confident with AI',
  business: 'Start my own business',
  earn_more: 'Earn more',
}

/** `primary_fear` — "What scares you most about AI and your career?" */
const FEAR_LABELS: Record<string, string> = {
  replaced: 'Being replaced by AI',
  behind: 'Falling behind others',
  opportunities: 'Missing new opportunities',
  none: 'Nothing in particular',
}

/** `daily_time_commitment` — "How much time do you want to dedicate?" */
const TIME_LABELS: Record<string, string> = {
  '10min': '10 min/day',
  '20min': '20 min/day',
  '30min': '30 min/day',
  '1hour': '1 hour/day',
}

/** `work_status` — "What's your current work status?" */
const WORK_STATUS_LABELS: Record<string, string> = {
  employee: 'Full-time employee',
  freelancer: 'Freelancer / Self-employed',
  owner: 'Business owner',
  switcher: 'Career switcher',
  exploring: 'Exploring options',
}

/**
 * Translates a stored answer to display text. Unknown values pass through
 * unchanged rather than being dropped: a flow can supply an already-readable
 * label, and even a bare unmapped slug beats an empty row on the paywall.
 */
function label(map: Record<string, string>, value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) return undefined
  return map[value] ?? value
}

/** Display text for the paywall's "What you want" row. */
export function goalLabel(value: unknown): string | undefined {
  return label(GOAL_LABELS, value)
}

/** Display text for the paywall's "What was holding you back" row. */
export function fearLabel(value: unknown): string | undefined {
  return label(FEAR_LABELS, value)
}

/** Display text for the paywall's "Time you'll commit" row. */
export function timeCommitmentLabel(value: unknown): string | undefined {
  return label(TIME_LABELS, value)
}

/** Display text for a work-status answer. */
export function workStatusLabel(value: unknown): string | undefined {
  return label(WORK_STATUS_LABELS, value)
}
