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

const lessonCtxSchema = z.object({
  lessonLabel: z.string().min(1),
  moduleLabel: z.string().optional(),
  stepIndex: z.number().int().min(0),
  stepCount: z.number().int().min(1),
  contentSummary: z.string().max(2000).optional(),
  learnerBackground: z.string().max(500).optional(),
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
 * Counts how many user messages the learner sent to Lexi today (UTC day).
 */
async function countTodayMessages(userId: string): Promise<number> {
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  const { count } = await supabaseAdmin
    .from('lexi_messages')
    .select('lexi_threads!inner(user_id)', { count: 'exact', head: true })
    .eq('lexi_threads.user_id', userId)
    .eq('role', 'user')
    .gte('created_at', todayStart.toISOString())

  return count ?? 0
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
  try {
    const { userId } = req as AuthenticatedRequest
    const body = streamMessageSchema.parse(req.body)

    // --- Daily cap guard ---
    const [used, cap] = await Promise.all([
      countTodayMessages(userId),
      getDailyCapForUser(userId),
    ])
    if (used >= cap) {
      throw new AppError(
        429,
        `You've reached your daily Lexi limit (${cap} messages). Come back tomorrow or upgrade your plan.`
      )
    }

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
      res.write(`data: ${JSON.stringify(payload)}\n\n`)
    }

    // Send thread/message IDs so the client can anchor the conversation
    sendEvent({ type: 'thread', threadId: resolvedThreadId, userMessageId: userMsg.id })

    // --- Stream Claude response ---
    const ctx: LexiLessonContext = body.lessonCtx
    let fullContent = ''

    try {
      const gen = streamLexiResponse(history, ctx)
      for await (const chunk of gen) {
        fullContent += chunk
        sendEvent({ type: 'delta', text: chunk })
      }
    } catch (streamErr) {
      const msg = streamErr instanceof Error ? streamErr.message : 'AI error'
      sendEvent({ type: 'error', message: msg })
      res.end()
      return
    }

    // Handle refusal (Claude declined to answer)
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
      sendEvent({ type: 'error', message: 'Failed to save response.' })
      res.end()
      return
    }

    sendEvent({ type: 'done', messageId: aiMsg.id })
    res.end()
  } catch (err) {
    if (res.headersSent) {
      const msg = err instanceof Error ? err.message : 'Server error'
      res.write(`data: ${JSON.stringify({ type: 'error', message: msg })}\n\n`)
      res.end()
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
