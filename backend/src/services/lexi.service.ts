/**
 * Lexi AI service — streams Claude responses for the in-course mentor widget.
 *
 * Key design choices:
 *  - Always uses claude-sonnet-4-6 (fast, cost-effective for high-volume course chat).
 *  - Prompt caching: stable persona block gets cache_control=ephemeral → ~10× cheaper reads.
 *  - Stateless streaming via async generator; caller owns SSE/DB writes.
 *  - Mock mode: when ANTHROPIC_API_KEY is absent, streams a canned reply word-by-word.
 */

import Anthropic from '@anthropic-ai/sdk'
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

export const LEXI_MODEL = 'claude-sonnet-4-6'
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
 * Mock streaming reply used in local dev when ANTHROPIC_API_KEY is absent.
 * Emits individual words with a short delay to simulate typing.
 */
async function* mockStream(): AsyncGenerator<string> {
  const reply =
    "Hi! I'm Lexi, your AI learning mentor. I'm running in demo mode right now (no API key configured). " +
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
 * @yields string — incremental text chunks from Claude
 * @returns Anthropic final message (usage, stop_reason, etc.) via stream.get_final_message()
 */
export async function* streamLexiResponse(
  turns: LexiTurn[],
  ctx: LexiLessonContext
): AsyncGenerator<string, Anthropic.Message, undefined> {
  const key = env.ANTHROPIC_API_KEY?.trim()

  if (!key) {
    yield* mockStream()
    // Mock final message shape — only used for usage logging
    return {
      id: 'mock',
      type: 'message',
      role: 'assistant',
      content: [],
      model: LEXI_MODEL,
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: 0, output_tokens: 0 },
    } as unknown as Anthropic.Message
  }

  const client = new Anthropic({ apiKey: key })
  const history = trimHistory(turns)
  if (!history.length) throw new AppError(400, 'Conversation must have at least one user message.')

  const systemBlocks: Anthropic.TextBlockParam[] = [
    {
      type: 'text',
      text: LEXI_SYSTEM_PROMPT,
      // Stable block → cached after the first request; ~10× cheaper on re-reads
      cache_control: { type: 'ephemeral' },
    },
    {
      type: 'text',
      text: buildLessonContextBlock(ctx),
    },
  ]

  let stream: ReturnType<typeof client.messages.stream>
  try {
    stream = client.messages.stream({
      model: LEXI_MODEL,
      max_tokens: LEXI_MAX_TOKENS,
      system: systemBlocks,
      messages: history.map((t) => ({ role: t.role, content: t.content })),
    })
  } catch (e) {
    throw mapAnthropicError(e)
  }

  try {
    for await (const chunk of stream.text_stream) {
      yield chunk
    }
  } catch (e) {
    throw mapAnthropicError(e)
  }

  return stream.get_final_message()
}

/**
 * Maps Anthropic SDK errors to AppError with a safe client-facing message.
 */
function mapAnthropicError(err: unknown): AppError {
  if (err instanceof AppError) return err
  const AnthropicAPIError = Anthropic.APIError
  if (err instanceof AnthropicAPIError) {
    const s = err.status
    const status = typeof s === 'number' && s >= 400 && s < 600 ? s : 502
    return new AppError(status, `Lexi (Claude): ${err.message}`)
  }
  const msg = err instanceof Error ? err.message : 'Unknown error'
  return new AppError(502, `Lexi (Claude): ${msg}`)
}
