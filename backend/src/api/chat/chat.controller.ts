import type { Request, Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from '../../types/index.js'
import { z } from 'zod'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'
import { getAIResponse, AVAILABLE_MODELS } from '../../services/ai.service.js'
import { deductCredit, getBalance } from '../../services/credit.service.js'

const sendMessageSchema = z.object({
  sessionId: z.string().uuid().optional(),
  modelId: z.string().min(1),
  content: z.string().min(1),
})

export async function getModels(
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  res.json(AVAILABLE_MODELS)
}

export async function sendMessage(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    const body = sendMessageSchema.parse(req.body)

    // Check credits first (throws 403 if insufficient)
    const balance = await getBalance(userId)
    if (balance <= 0) throw new AppError(403, 'Insufficient credits')

    let sessionId = body.sessionId

    // Create new session if none provided
    if (!sessionId) {
      const title =
        body.content.length > 50
          ? body.content.slice(0, 50).replace(/\s+\S*$/, '...')
          : body.content

      const { data: session, error: sessionError } = await supabaseAdmin
        .from('chat_sessions')
        .insert({
          user_id: userId,
          title,
          model_id: body.modelId,
        })
        .select('id')
        .single()

      if (sessionError) throw new AppError(500, sessionError.message)
      sessionId = session.id
    }

    // Save user message
    const { data: userMsg, error: userMsgError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'user',
        content: body.content,
      })
      .select()
      .single()

    if (userMsgError) throw new AppError(500, userMsgError.message)

    // Get AI response
    const aiContent = await getAIResponse(body.modelId, body.content)

    // Deduct credit AFTER successful AI response
    const creditsRemaining = await deductCredit(userId)

    // Save assistant message
    const { data: aiMsg, error: aiMsgError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: aiContent,
      })
      .select()
      .single()

    if (aiMsgError) throw new AppError(500, aiMsgError.message)

    // Update session timestamp
    await supabaseAdmin
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId)

    res.json({
      sessionId,
      userMessage: userMsg,
      assistantMessage: aiMsg,
      creditsRemaining,
    })
  } catch (err) {
    next(err)
  }
}

export async function listSessions(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest

    const { data, error } = await supabaseAdmin
      .from('chat_sessions')
      .select('id, title, model_id, created_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) throw new AppError(500, error.message)

    res.json(data ?? [])
  } catch (err) {
    next(err)
  }
}

export async function getSession(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest

    const { data: session, error } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single()

    if (error || !session) throw new AppError(404, 'Session not found')

    const { data: messages } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true })

    res.json({ ...session, messages: messages ?? [] })
  } catch (err) {
    next(err)
  }
}

export async function deleteSession(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest

    const { error } = await supabaseAdmin
      .from('chat_sessions')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', userId)

    if (error) throw new AppError(500, error.message)

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function getCredits(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    const balance = await getBalance(userId)
    res.json({ balance })
  } catch (err) {
    next(err)
  }
}
