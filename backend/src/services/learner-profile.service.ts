/**
 * Builds the "learner background" block that personalises Lexi's replies.
 *
 * Why this is server-side: the field used to be sent by the browser, which meant
 * anyone could inject arbitrary text straight into Lexi's system prompt. The
 * client no longer supplies it — we derive it from data we already trust.
 *
 * Source is the pre-signup funnel quiz: landing_quiz_submissions.answers, a
 * jsonb map of answer_key -> raw value ("main_goal": "faster"). Raw values are
 * unreadable on their own, so they are resolved to the real question text and
 * option label via quiz_steps ("How would learning Claude benefit you?" ->
 * "Work faster"). That dictionary is per-version content, not per-user, so it is
 * cached in memory.
 *
 * Note quiz_answers_latest looks like a better source (it has answer_label), but
 * it is not usable here: its `email` column is null in practice and its
 * `question_text` holds the answer key rather than prose, so it cannot be joined
 * to an account or rendered.
 *
 * Everything fails open: no quiz row means no background block, and Lexi behaves
 * exactly as it did before.
 */

import { supabaseAdmin } from '../db/supabase.js'

/** Hard cap on the rendered block — keeps the prompt bounded. */
const MAX_BACKGROUND_CHARS = 700

/** How long the quiz label dictionary is reused before re-reading the DB. */
const LABELS_TTL_MS = 5 * 60_000

/**
 * Answer keys worth telling Lexi about, in render order.
 *
 * Deliberately a subset. Demographics (age_band, gender), commitment gates
 * (commit_*) and study-preference answers don't change how Lexi should coach,
 * and would just burn prompt budget. The pain/fear answers are included because
 * the persona is explicitly meant to reframe them.
 */
const RELEVANT_KEYS: readonly string[] = [
  'work_status',
  'career_goal',
  'main_goal',
  'learning_intent',
  'ai_experience_rating',
  'primary_fear',
  'belief_no_code',
  'time_horizon',
  'daily_time_commitment',
]

/** Fallback labels for keys whose quiz_steps row is missing or unpublished. */
const FALLBACK_LABELS: Record<string, string> = {
  work_status: 'Current work',
  career_goal: 'Career goal',
  main_goal: 'Main motivation',
  learning_intent: 'Learning for',
  ai_experience_rating: 'AI experience so far',
  primary_fear: 'Biggest worry',
  belief_no_code: 'Belief about building without code',
  time_horizon: 'Time horizon',
  daily_time_commitment: 'Time available per day',
}

type AnswerKeyLabels = {
  /** Prompt label for the key — the quiz question text when available. */
  question: string
  /** Raw option value -> human label. */
  options: Record<string, string>
}

let labelCache: { at: number; value: Map<string, AnswerKeyLabels> } | null = null

/**
 * Loads question text + option labels for the relevant answer keys.
 *
 * Not scoped to an active version: v1.0.0 ships with is_active = false, so an
 * active-version filter returns nothing today. Keys are stable across versions,
 * so the newest row per key is good enough for prose labels.
 */
async function getAnswerLabels(): Promise<Map<string, AnswerKeyLabels>> {
  if (labelCache && Date.now() - labelCache.at < LABELS_TTL_MS) return labelCache.value

  const result = new Map<string, AnswerKeyLabels>()
  try {
    const { data, error } = await supabaseAdmin
      .from('quiz_steps')
      .select('answer_key, question_text, options')
      .in('answer_key', RELEVANT_KEYS as string[])

    if (!error) {
      for (const row of data ?? []) {
        const key = row.answer_key?.trim()
        if (!key || result.has(key)) continue

        const options: Record<string, string> = {}
        if (Array.isArray(row.options)) {
          for (const opt of row.options as Array<{ value?: unknown; label?: unknown }>) {
            if (typeof opt?.value === 'string' && typeof opt?.label === 'string') {
              options[opt.value] = opt.label
            }
          }
        }

        result.set(key, {
          question: row.question_text?.trim() || FALLBACK_LABELS[key] || key,
          options,
        })
      }
    }
  } catch (err) {
    // A content-read failure must not break the chat: fall through to the
    // fallback labels below, which still produce a usable block.
    console.error('[lexi] failed to load quiz labels', err)
  }

  labelCache = { at: Date.now(), value: result }
  return result
}

/**
 * Turns a raw answer value into a readable fragment, preferring the quiz's own
 * option label and degrading to de-snake_cased text ("earn_more" -> "earn more").
 * Values that carry no meaning on their own ("skip", "none") are dropped.
 */
function humanizeValue(value: unknown, options: Record<string, string>): string | null {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)

  if (Array.isArray(value)) {
    const parts = value.map((v) => humanizeValue(v, options)).filter((v): v is string => !!v)
    return parts.length ? parts.join(', ') : null
  }

  if (typeof value !== 'string') return null

  const raw = value.trim()
  if (!raw) return null
  if (raw === 'skip' || raw === 'none' || raw === 'prefer_not_to_say') return null

  const mapped = options[raw]
  if (mapped?.trim()) return mapped.trim()

  // Already prose in some rows (e.g. career_goal: "Build my own business").
  if (/\s/.test(raw)) return raw

  return raw.replace(/[_-]+/g, ' ')
}

/**
 * Renders label/value pairs, stopping at MAX_BACKGROUND_CHARS so a long answer
 * can never crowd out the lesson content that follows it in the prompt.
 */
function renderBlock(pairs: Array<[string, string]>): string | null {
  const lines: string[] = []
  let length = 0

  for (const [label, value] of pairs) {
    const line = `- ${label} ${value}`
    if (length + line.length + 1 > MAX_BACKGROUND_CHARS) break
    lines.push(line)
    length += line.length + 1
  }

  return lines.length ? lines.join('\n') : null
}

/**
 * Builds the learner background block for a user, or null when we know nothing
 * about them. Never throws — personalisation is a bonus, not a dependency.
 */
export async function getLearnerBackground(userId: string): Promise<string | null> {
  try {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', userId)
      .maybeSingle()

    const email = user?.email?.trim().toLowerCase()
    if (!email) return null

    // (email, landing) is unique but a learner has one account, so take the
    // newest row across landings rather than guessing which landing they used.
    const { data: lead } = await supabaseAdmin
      .from('landing_quiz_submissions')
      .select('answers')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const answers = lead?.answers
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return null

    const map = answers as Record<string, unknown>
    const labels = await getAnswerLabels()
    const pairs: Array<[string, string]> = []

    for (const key of RELEVANT_KEYS) {
      if (!(key in map)) continue
      const entry = labels.get(key)
      const value = humanizeValue(map[key], entry?.options ?? {})
      if (!value) continue
      pairs.push([entry?.question ?? FALLBACK_LABELS[key] ?? key, value])
    }

    if (!pairs.length) return null
    return renderBlock(pairs)
  } catch (err) {
    console.error('[lexi] failed to build learner background', err)
    return null
  }
}

/** Test seam: clears the in-memory label cache. */
export function __resetLabelCache(): void {
  labelCache = null
}
