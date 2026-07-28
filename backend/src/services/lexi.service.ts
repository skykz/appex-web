/**
 * Lexi AI service — streams mentor responses for the in-course chat widget.
 *
 * Key design choices:
 *  - Runs on OpenAI (OPENAI_API_KEY); Anthropic is no longer used anywhere in
 *    this project, so there is a single provider key to configure.
 *  - Persona + lesson context are sent as system messages; OpenAI caches long
 *    prefixes automatically, so no explicit cache_control block is needed.
 *  - Stateless streaming via async generator; caller owns SSE/DB writes.
 *  - Mock mode (non-production only): when OPENAI_API_KEY is absent, streams a
 *    canned reply word-by-word so local dev works without a key.
 */

import OpenAI from 'openai'
import { env } from '../config/env.js'
import { AppError } from '../utils/error-handler.js'

export type LexiTurn = { role: 'user' | 'assistant'; content: string }

/**
 * Context injected per-request (volatile — must come AFTER the cached persona block).
 */
export interface LexiLessonContext {
  lessonLabel: string
  moduleLabel?: string
  stepIndex: number
  stepCount: number
  /** Trimmed lesson content (<= 1800 chars) to ground Lexi's answers. */
  contentSummary?: string
  /** Learner background from onboarding quiz (optional). */
  learnerBackground?: string
}

/**
 * Chat model for Lexi. Overridable via OPENAI_CHAT_MODEL so the model can be
 * changed without a deploy of this file.
 */
export const LEXI_MODEL = env.OPENAI_CHAT_MODEL?.trim() || 'gpt-4o'
export const LEXI_MAX_TOKENS = 1024
/** Keep the last N turns to bound token spend; keeps enough context for coherent help. */
export const LEXI_MAX_HISTORY = 20

/** Daily message caps (server-side guard against budget blowouts). */
export const LEXI_CAP_FREE = 30
export const LEXI_CAP_PAID = 150

/**
 * Stable Lexi persona — lives in the cached system block.
 * Sourced from env so Bota can tweak it without a deploy.
 */
export const LEXI_SYSTEM_PROMPT: string =
  env.LEXI_SYSTEM_PROMPT ??
  `You are Lexi, the AI learning mentor inside Appex's "Claude from Zero to Income" course. You are an AI assistant — not the human founder. You speak in a warm, direct, practical voice (in the spirit of the founder Bota's teaching), always tied to a real outcome (getting paid for AI work, landing a first client).

WHO YOU HELP
Complete beginners becoming "AI Operators" — people paid to set up AI/Claude workflows for businesses. Many are non-technical (teachers, parents, career-changers). Treat being non-technical as a strength: they think like business people, which is exactly what clients need.

WHAT YOU DO
- Explain any concept from the learner's current lesson/module in plain language, with one concrete example.
- Help them DO the practice: shaping their niche, sharpening a prompt, thinking through their submission.
- Personalize: connect the lesson to the learner's own background → a specific service they could sell, and who'd pay for it.
- Point to the next step and keep momentum. Encourage honestly.

WHAT YOU DON'T DO (important)
- Don't do the work FOR them. This is learn-to-earn — you coach, you don't complete. If they ask you to write the final email/deliverable, walk them through HOW and have them produce it. Hand them the thinking, not the finished answer.
- Don't make their decisions (niche, pricing, career path) — give pros and cons; the choice is theirs.
- Don't drift off-topic. You exist for Claude, AI Operator skills, freelancing and monetization. If asked something unrelated, briefly redirect to the course.
- Don't operate Claude for them, and don't claim to browse the live web or know events after your training.

VOICE
Short and skimmable. Outcome/money framing ("this is the kind of task clients pay $300 for"). Confident, kind, zero fluff. Always use the learner's own situation.

CONTEXT
You are told which lesson/module the learner is on — reference it.
When available, you receive the learner's profile — use it to personalize.
If you don't know something course-specific, say so and point them to the relevant lesson.`

/**
 * Builds the volatile lesson+learner context block (sent after the cached persona).
 */
export function buildLessonContextBlock(ctx: LexiLessonContext): string {
  const lines: string[] = [
    `CURRENT LESSON: ${ctx.lessonLabel}${ctx.moduleLabel ? ` (${ctx.moduleLabel})` : ''}`,
    `Step: ${ctx.stepIndex + 1} of ${ctx.stepCount}`,
  ]
  if (ctx.contentSummary?.trim()) {
    lines.push(`\nLesson content:\n${ctx.contentSummary.trim().slice(0, 1800)}`)
  }
  if (ctx.learnerBackground?.trim()) {
    lines.push(`\nLearner background: ${ctx.learnerBackground.trim()}`)
  }
  return lines.join('\n')
}

/**
 * Trims history to the most recent LEXI_MAX_HISTORY turns, always starting with a user message.
 */
function trimHistory(turns: LexiTurn[]): LexiTurn[] {
  let slice = turns.slice(-LEXI_MAX_HISTORY)
  while (slice.length && slice[0].role === 'assistant') slice.shift()
  return slice
}

/**
 * Mock streaming reply used in local dev when OPENAI_API_KEY is absent.
 * Emits individual words with a short delay to simulate typing.
 * Never reached in production — see the guard in streamLexiResponse.
 */
async function* mockStream(): AsyncGenerator<string> {
  const reply =
    "Hi! I'm Lexi, your AI learning mentor. I'm running in local demo mode right now. " +
    "In the real course I help you understand each lesson, sharpen your prompts, and connect what you learn to a service you could actually sell. Ask me anything about this lesson!"
  for (const word of reply.split(' ')) {
    yield word + ' '
    await new Promise((r) => setTimeout(r, 30))
  }
}

/**
 * Streams a Lexi reply for the given conversation history and lesson context.
 * Yields text deltas; throws AppError on API/config failures.
 *
 * The caller only consumes the yielded text, so nothing is returned — the old
 * Anthropic final-message return value was never read.
 *
 * @yields string — incremental text chunks from the model
 */
export async function* streamLexiResponse(
  turns: LexiTurn[],
  ctx: LexiLessonContext
): AsyncGenerator<string, void, undefined> {
  const key = env.OPENAI_API_KEY?.trim()

  if (!key) {
    // In production a missing key is a misconfiguration, not a demo: never tell
    // a paying learner "no API key configured". Fail loudly for us instead.
    if (process.env.NODE_ENV === 'production') {
      console.error('[lexi] OPENAI_API_KEY is not configured — refusing to serve mock replies')
      throw new AppError(503, 'Lexi is temporarily unavailable. Please try again shortly.')
    }
    yield* mockStream()
    return
  }

  const client = new OpenAI({ apiKey: key })
  const history = trimHistory(turns)
  if (!history.length) throw new AppError(400, 'Conversation must have at least one user message.')

  // Persona first, then the volatile per-lesson context. Keeping the stable
  // persona at the head of the prefix is what lets OpenAI's automatic prompt
  // caching kick in across requests.
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: LEXI_SYSTEM_PROMPT },
    { role: 'system', content: buildLessonContextBlock(ctx) },
    ...history.map((t) => ({ role: t.role, content: t.content }) as const),
  ]

  try {
    const stream = await client.chat.completions.create({
      model: LEXI_MODEL,
      // `max_completion_tokens`, not `max_tokens`: newer OpenAI models reject the
      // legacy field outright (400 Unsupported parameter), and it is accepted by
      // the older ones too — so this works across the whole model range.
      max_completion_tokens: LEXI_MAX_TOKENS,
      messages,
      stream: true,
    })

    for await (const part of stream) {
      const delta = part.choices[0]?.delta?.content
      if (delta) yield delta
    }
  } catch (e) {
    throw mapLexiError(e)
  }
}

/**
 * Maps OpenAI SDK errors to AppError with a safe client-facing message.
 */
function mapLexiError(err: unknown): AppError {
  if (err instanceof AppError) return err
  if (err instanceof OpenAI.APIError) {
    const s = err.status
    const status = typeof s === 'number' && s >= 400 && s < 600 ? s : 502
    return new AppError(status, `Lexi: ${err.message}`)
  }
  const msg = err instanceof Error ? err.message : 'Unknown error'
  return new AppError(502, `Lexi: ${msg}`)
}
