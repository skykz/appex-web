/**
 * Lexi controller — handles the in-course AI mentor HTTP endpoints.
 *
 * Endpoints:
 *   POST /api/lexi/stream      — SSE streaming chat (main mentor turn)
 *   GET  /api/lexi/thread      — get or create the learner's thread for a course
 *   GET  /api/lexi/thread/:id/messages — load thread history (for widget re-open)
 *   PATCH /api/lexi/messages/:id/feedback — store 👍/👎 rating
 */

import type { Request, Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from '../../types/index.js'
import { z } from 'zod'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'
import {
  streamLexiResponse,
  LEXI_CAP_FREE,
  LEXI_CAP_PAID,
  type LexiTurn,
  type LexiLessonContext,
} from '../../services/lexi.service.js'
import { getLearnerBackground } from '../../services/learner-profile.service.js'

const lessonCtxSchema = z.object({
  lessonLabel: z.string().min(1),
  moduleLabel: z.string().optional(),
  stepIndex: z.number().int().min(0),
  stepCount: z.number().int().min(1),
  contentSummary: z.string().max(2000).optional(),
  // learnerBackground is intentionally NOT accepted here — it is derived
  // server-side from the learner's quiz answers. It ends up inside a system
  // message, so trusting the client with it would be prompt injection.
})

const streamMessageSchema = z.object({
  threadId: z.string().uuid().optional(),
  content: z.string().min(1).max(4000),
  lessonCtx: lessonCtxSchema,
})

const feedbackSchema = z.object({
  feedback: z.union([z.literal(1), z.literal(-1)]),
})

/**
 * Returns the daily message cap for a user based on their subscription status.
 * Paid (active/trialing) users get a higher cap.
 */
async function getDailyCapForUser(userId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .maybeSingle()

  return data ? LEXI_CAP_PAID : LEXI_CAP_FREE
}

/**
 * Atomically claims one message against the learner's daily quota.
 *
 * Returns true when the message may proceed. Deliberately NOT a count-then-check:
 * that raced, letting N concurrent requests all pass a cap of 30 and bill us for
 * every one. The claim happens inside a single locking statement in Postgres —
 * see migration 040_lexi_rate_limit.sql.
 */
async function claimDailyQuota(userId: string, cap: number): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('lexi_claim_daily_quota', {
    p_user_id: userId,
    p_cap: cap,
  })

  // Fail closed on an RPC error: the quota is the only thing standing between one
  // account and an unbounded OpenAI bill, so a broken check must not mean "allow".
  if (error) {
    console.error('[lexi] quota claim failed', error)
    throw new AppError(503, 'Lexi is temporarily unavailable. Please try again shortly.')
  }

  return data !== null
}

/**
 * Returns a claimed message to the quota after a turn fails, so a request the
 * learner got nothing out of doesn't burn their allowance. Best-effort.
 */
async function releaseDailyQuota(userId: string): Promise<void> {
  const { error } = await supabaseAdmin.rpc('lexi_release_daily_quota', { p_user_id: userId })
  if (error) console.error('[lexi] quota release failed', error)
}

/**
 * Loads the last N user+assistant turns for a given thread.
 */
async function loadThreadHistory(threadId: string, limit = 40): Promise<LexiTurn[]> {
  const { data, error } = await supabaseAdmin
    .from('lexi_messages')
    .select('role, content')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) throw new AppError(500, error.message)

  return (data ?? [])
    .filter(
      (r): r is { role: 'user' | 'assistant'; content: string } =>
        r.role === 'user' || r.role === 'assistant'
    )
    .map((r) => ({ role: r.role, content: r.content }))
}

/**
 * POST /api/lexi/stream
 *
 * Main endpoint — checks daily cap, saves the user turn, streams Claude via SSE,
 * then saves the assistant turn. Emits:
 *   {type:"thread", threadId, userMessageId}
 *   {type:"delta", text}            (repeated for each chunk)
 *   {type:"done",  messageId}
 *   {type:"error", message}         (on failure after headers are sent)
 */
export async function streamMessage(req: Request, res: Response, next: NextFunction) {
  const { userId } = req as AuthenticatedRequest
  // Declared outside the try so every failure path below can hand the quota back.
  let quotaClaimed = false

  try {
    const body = streamMessageSchema.parse(req.body)

    // --- Daily cap guard ---
    // The learner background rides along in the same batch so personalisation
    // costs no extra round-trip latency on the critical path.
    const [cap, learnerBackground] = await Promise.all([
      getDailyCapForUser(userId),
      getLearnerBackground(userId),
    ])

    // Claim the quota slot BEFORE doing any paid work. From here on, any failure
    // path must release it (see releaseDailyQuota below).
    if (!(await claimDailyQuota(userId, cap))) {
      throw new AppError(
        429,
        `You've reached your daily Lexi limit (${cap} messages). Come back tomorrow or upgrade your plan.`
      )
    }
    quotaClaimed = true

    // --- Get or create thread ---
    let resolvedThreadId: string
    if (!body.threadId) {
      const { data: thread, error: threadErr } = await supabaseAdmin
        .from('lexi_threads')
        .insert({ user_id: userId })
        .select('id')
        .single()

      if (threadErr || !thread) throw new AppError(500, threadErr?.message ?? 'Failed to create thread.')
      resolvedThreadId = thread.id
    } else {
      // Verify the thread belongs to this user
      const { data: existing } = await supabaseAdmin
        .from('lexi_threads')
        .select('id')
        .eq('id', body.threadId)
        .eq('user_id', userId)
        .maybeSingle()

      if (!existing) throw new AppError(404, 'Thread not found.')
      resolvedThreadId = body.threadId
    }

    // --- Save user message ---
    const { data: userMsg, error: userMsgErr } = await supabaseAdmin
      .from('lexi_messages')
      .insert({ thread_id: resolvedThreadId, role: 'user', content: body.content })
      .select('id')
      .single()

    if (userMsgErr) throw new AppError(500, userMsgErr.message)

    // --- Load history (includes the message we just inserted) ---
    const history = await loadThreadHistory(resolvedThreadId)

    // --- Open SSE stream ---
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no') // disable nginx buffering

    const sendEvent = (payload: Record<string, unknown>) => {
      if (res.writableEnded) return
      res.write(`data: ${JSON.stringify(payload)}\n\n`)
    }

    // Send thread/message IDs so the client can anchor the conversation
    sendEvent({ type: 'thread', threadId: resolvedThreadId, userMessageId: userMsg.id })

    // --- Stream the model response ---
    const ctx: LexiLessonContext = {
      ...body.lessonCtx,
      ...(learnerBackground ? { learnerBackground } : {}),
    }

    // Abort the upstream generation as soon as the learner goes away. Without
    // this, closing the tab mid-reply leaves OpenAI generating (and billing)
    // the rest of a completion that nobody will ever read.
    const ac = new AbortController()
    const onClose = () => ac.abort()
    res.on('close', onClose)

    let fullContent = ''

    try {
      for await (const chunk of streamLexiResponse(history, ctx, ac.signal)) {
        fullContent += chunk
        sendEvent({ type: 'delta', text: chunk })
      }
    } catch (streamErr) {
      // Never forward upstream text: OpenAI messages can carry our org id and a
      // partial key fingerprint. Log the detail, show the learner a safe string.
      console.error('[lexi] stream failed', streamErr)
      // The learner got no usable answer, so don't charge them a message.
      if (quotaClaimed) {
        quotaClaimed = false
        await releaseDailyQuota(userId)
      }
      sendEvent({
        type: 'error',
        message:
          streamErr instanceof AppError
            ? streamErr.message
            : 'Lexi is temporarily unavailable. Please try again shortly.',
      })
      res.end()
      return
    } finally {
      res.off('close', onClose)
    }

    // Learner left mid-stream: the partial reply is worthless to them and would
    // poison the thread history on their next turn, so drop it rather than save.
    // The quota claim STANDS here — abandoning streams is the abuse path we're
    // guarding against, so it must still cost the abuser a message.
    if (ac.signal.aborted) {
      quotaClaimed = false
      if (!res.writableEnded) res.end()
      return
    }

    // Handle refusal (the model declined to answer)
    if (!fullContent.trim()) {
      fullContent =
        "I'm not sure how to answer that in the context of this course — let me redirect you to the lesson materials."
    }

    // --- Save assistant message ---
    const { data: aiMsg, error: aiMsgErr } = await supabaseAdmin
      .from('lexi_messages')
      .insert({ thread_id: resolvedThreadId, role: 'assistant', content: fullContent })
      .select('id')
      .single()

    if (aiMsgErr) {
      console.error('[lexi] failed to save assistant message', aiMsgErr)
      // Returns early past the catch block, so release the quota here too.
      if (quotaClaimed) {
        quotaClaimed = false
        await releaseDailyQuota(userId)
      }
      sendEvent({ type: 'error', message: 'Failed to save response.' })
      res.end()
      return
    }

    // Turn completed and was saved — the claimed message is legitimately spent.
    quotaClaimed = false

    sendEvent({ type: 'done', messageId: aiMsg.id })
    res.end()
  } catch (err) {
    // Any failure before a delivered answer gives the message back. The 429 from
    // the cap itself never sets quotaClaimed, so it can't refund a rejected claim.
    if (quotaClaimed) {
      quotaClaimed = false
      await releaseDailyQuota(userId)
    }
    if (res.headersSent) {
      // Past the headers the errorHandler can't run, so surface it on the stream.
      // Only AppError text is learner-safe; anything else is logged, not echoed.
      console.error('[lexi] stream request failed', err)
      const message =
        err instanceof AppError ? err.message : 'Something went wrong. Please try again.'
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`)
        res.end()
      }
    } else {
      next(err)
    }
  }
}

/**
 * GET /api/lexi/thread?courseId=<skillId>
 *
 * Returns the learner's existing thread for a course (or creates one if absent).
 * Returns: { id, created_at }
 */
export async function getOrCreateThread(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthenticatedRequest
    const courseId = typeof req.query.courseId === 'string' ? req.query.courseId : null

    // Try to find an existing thread
    let query = supabaseAdmin
      .from('lexi_threads')
      .select('id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (courseId) {
      query = query.eq('course_id', courseId) as typeof query
    } else {
      query = query.is('course_id', null) as typeof query
    }

    const { data: existing } = await query.maybeSingle()
    if (existing) return res.json(existing)

    // Create a new thread
    const { data: created, error } = await supabaseAdmin
      .from('lexi_threads')
      .insert({ user_id: userId, course_id: courseId })
      .select('id, created_at')
      .single()

    if (error) throw new AppError(500, error.message)
    res.json(created)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/lexi/thread/:id/messages
 *
 * Returns all messages for a thread (ownership verified).
 */
export async function getThreadMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthenticatedRequest
    const threadId = req.params.id

    // Ownership check
    const { data: thread } = await supabaseAdmin
      .from('lexi_threads')
      .select('id')
      .eq('id', threadId)
      .eq('user_id', userId)
      .maybeSingle()

    if (!thread) throw new AppError(404, 'Thread not found.')

    const { data: messages, error } = await supabaseAdmin
      .from('lexi_messages')
      .select('id, role, content, feedback, created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })

    if (error) throw new AppError(500, error.message)
    res.json(messages ?? [])
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/lexi/messages/:id/feedback
 *
 * Stores learner's 👍 (1) or 👎 (-1) on an assistant message.
 */
export async function submitFeedback(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthenticatedRequest
    const messageId = req.params.id
    const { feedback } = feedbackSchema.parse(req.body)

    // Verify ownership via join: message → thread → user
    const { data: msg } = await supabaseAdmin
      .from('lexi_messages')
      .select('id, lexi_threads!inner(user_id)')
      .eq('id', messageId)
      .eq('lexi_threads.user_id', userId)
      .eq('role', 'assistant')
      .maybeSingle()

    if (!msg) throw new AppError(404, 'Message not found.')

    const { error } = await supabaseAdmin
      .from('lexi_messages')
      .update({ feedback })
      .eq('id', messageId)

    if (error) throw new AppError(500, error.message)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}
