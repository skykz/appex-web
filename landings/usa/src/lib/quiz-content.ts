import { getApiBaseUrl } from './landing-api'

/**
 * Loads quiz content published from the admin, with the hardcoded flow as the
 * fallback.
 *
 * The fallback is the important part. This runs at the very top of a paid-traffic
 * funnel, so a slow or failing content request must never leave a visitor
 * looking at a spinner — anything other than a fast success silently falls back
 * to the built-in quiz, and the funnel proceeds as it does today.
 */

export interface RemoteQuizStep {
  step_id: string
  step_order: number
  step_type: string
  section: string
  question_text: string | null
  subtitle: string | null
  answer_key: string | null
  options: { value: string; label: string; icon?: string; emoji?: string }[]
  input_type: string
  content: Record<string, unknown>
  next_step_id: string | null
  progress_title: string | null
  progress_value: number | null
}

export interface RemoteQuiz {
  version: string
  landing: string
  steps: RemoteQuizStep[]
}

/**
 * How long to wait before giving up and rendering the built-in quiz.
 *
 * Deliberately short: a visitor who has just tapped "Start" is watching a blank
 * screen for this entire window, and the built-in flow is a complete substitute.
 * Waiting longer trades a guaranteed cost (delay for everyone) against a
 * marginal gain (remote content for the few on a slow connection).
 */
const TIMEOUT_MS = 2500

let inflight: Promise<RemoteQuiz | null> | null = null

/**
 * Fetches the active quiz. Resolves to null on any failure, timeout, or when no
 * version is published.
 *
 * De-duplicated: several components can ask during the same mount without
 * firing parallel requests.
 */
export function loadRemoteQuiz(landing = 'usa'): Promise<RemoteQuiz | null> {
  if (inflight) return inflight

  const base = getApiBaseUrl()
  if (!base) return Promise.resolve(null)

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS)

  inflight = fetch(`${base}/landing/quiz/content?landing=${encodeURIComponent(landing)}`, {
    signal: controller.signal,
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((body: { quiz?: RemoteQuiz | null } | null) => {
      const quiz = body?.quiz ?? null
      // A published-but-empty version would render a quiz with no questions,
      // which is worse than the built-in flow. Treat it as "nothing published".
      if (!quiz || !Array.isArray(quiz.steps) || quiz.steps.length === 0) return null
      return quiz
    })
    .catch(() => null)
    .finally(() => {
      window.clearTimeout(timer)
      // Cleared so a later navigation can retry; the response itself is cached
      // by the browser via Cache-Control.
      inflight = null
    })

  return inflight
}
