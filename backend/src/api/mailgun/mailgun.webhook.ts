import type { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from '../../db/supabase.js'
import { env } from '../../config/env.js'
import { verifyMailgunWebhookSignature } from '../../services/mailgun-verify.js'
import { AppError } from '../../utils/error-handler.js'

interface MailgunWebhookBody {
  signature?: {
    timestamp?: string
    token?: string
    signature?: string
  }
  'event-data'?: {
    event?: string
    severity?: string
    reason?: string
    recipient?: string
    message?: {
      headers?: {
        'message-id'?: string
      }
    }
  }
}

/**
 * Handles Mailgun delivery events for quiz welcome emails (failed, complained, delivered).
 * Configure in Mailgun → Webhooks → add URL https://<api>/api/mailgun/webhook
 */
export async function mailgunWebhookHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!env.MAILGUN_WEBHOOK_SIGNING_KEY) {
      throw new AppError(503, 'Mailgun webhooks are not configured')
    }

    const body = req.body as MailgunWebhookBody
    const sig = body.signature
    const timestamp = sig?.timestamp
    const token = sig?.token
    const signature = sig?.signature
    if (
      !timestamp ||
      !token ||
      !signature ||
      !verifyMailgunWebhookSignature(env.MAILGUN_WEBHOOK_SIGNING_KEY, {
        timestamp,
        token,
        signature,
      })
    ) {
      throw new AppError(403, 'Invalid Mailgun webhook signature')
    }

    const event = body['event-data']
    if (!event?.event) {
      res.status(200).json({ ok: true, ignored: true })
      return
    }

    const messageId = event.message?.headers?.['message-id'] ?? null
    const recipient = event.recipient?.trim().toLowerCase() ?? null

    if (messageId && (event.event === 'failed' || event.event === 'complained')) {
      const reason = [event.severity, event.reason, event.event].filter(Boolean).join(': ')
      const { error } = await supabaseAdmin
        .from('landing_quiz_submissions')
        .update({ welcome_email_error: reason.slice(0, 500) })
        .eq('welcome_email_mailgun_id', messageId)

      if (error) {
        console.error('[mailgun-webhook] failed to update submission', messageId, error.message)
      }
    }

    if (event.event === 'delivered' && messageId) {
      await supabaseAdmin
        .from('landing_quiz_submissions')
        .update({ welcome_email_error: null })
        .eq('welcome_email_mailgun_id', messageId)
    }

    if (process.env.NODE_ENV !== 'production') {
      console.info('[mailgun-webhook]', event.event, recipient ?? '-', messageId ?? '-')
    }

    res.status(200).json({ ok: true })
  } catch (err) {
    next(err)
  }
}
