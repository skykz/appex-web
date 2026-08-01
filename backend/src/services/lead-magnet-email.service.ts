/**
 * Sends the lead-magnet ("AI Agents Guidebook") email to quiz leads.
 *
 * Why this is separate from lifecycle-email.service.ts: every lifecycle email is
 * keyed to a `users` row and deduped through `user_email_log.user_id`. A quiz lead
 * has no account yet — that is the whole point — so neither mechanism applies.
 * Dedupe here goes through `landing_quiz_submissions.welcome_email_sent_at`, the
 * column migration 012 added for exactly this purpose and which, until now,
 * nothing ever wrote.
 *
 * Gated on env.leadGuidebookEnabled: with no LEAD_GUIDEBOOK_URL configured we send
 * nothing at all, because a "here's your guidebook" email with no guidebook behind
 * it breaks the promise more visibly than silence does.
 */

import { supabaseAdmin } from '../db/supabase.js'
import { env } from '../config/env.js'
import { firstNameFrom } from './email-templates/layout.js'
import { renderLeadGuidebookEmail } from './email-templates/lead-guidebook.js'
import { sendEmail } from './email.service.js'
import { appLog } from '../lib/logger.js'

/**
 * Sends the guidebook to one lead, at most once ever.
 *
 * Returns a short reason string describing what happened, for logging. Never
 * throws: this runs off the back of a quiz submission, and a mail failure must not
 * turn a captured lead into a 500 for the visitor.
 */
export async function sendLeadGuidebookEmail(args: {
  email: string
  name?: string | null
  landing: string
  reqId?: string
}): Promise<'sent' | 'skipped_disabled' | 'skipped_already_sent' | 'skipped_no_row' | 'failed'> {
  const guidebookUrl = env.LEAD_GUIDEBOOK_URL
  if (!env.leadGuidebookEnabled || !guidebookUrl) return 'skipped_disabled'

  try {
    // Read the row's current state so a re-submit (the quiz saves on every step)
    // cannot trigger a second send. Scoped by landing because (email, landing) is
    // the unique key — without it maybeSingle() throws once a 2nd landing exists.
    const { data: row, error: readErr } = await supabaseAdmin
      .from('landing_quiz_submissions')
      .select('id, name, welcome_email_sent_at')
      .eq('email', args.email)
      .eq('landing', args.landing)
      .maybeSingle()

    if (readErr) {
      appLog.error('lead_guidebook.read_failed', { reqId: args.reqId, error: readErr.message })
      return 'failed'
    }
    if (!row) return 'skipped_no_row'
    if (row.welcome_email_sent_at) return 'skipped_already_sent'

    // Claim the send BEFORE calling Mailgun. If the process dies mid-send we would
    // rather skip one guidebook than mail the same person repeatedly, and the quiz
    // submits on every step so retries are frequent.
    const claimedAt = new Date().toISOString()
    const { data: claimed, error: claimErr } = await supabaseAdmin
      .from('landing_quiz_submissions')
      .update({ welcome_email_sent_at: claimedAt })
      .eq('id', row.id)
      .is('welcome_email_sent_at', null)
      .select('id')
      .maybeSingle()

    if (claimErr) {
      appLog.error('lead_guidebook.claim_failed', { reqId: args.reqId, error: claimErr.message })
      return 'failed'
    }
    // Another concurrent submit won the claim — it is sending, so we must not.
    if (!claimed) return 'skipped_already_sent'

    const { subject, html, text } = renderLeadGuidebookEmail({
      firstName: firstNameFrom(args.name?.trim() || row.name?.trim() || ''),
      guidebookUrl,
    })

    try {
      const result = await sendEmail({
        to: args.email,
        subject,
        html,
        text,
        tag: 'lead-guidebook',
        // Marketing mail to a non-account holder: an unsubscribe path is required.
        listUnsubscribeMailto: env.MAILGUN_REPLY_TO ?? undefined,
      })

      // sendEmail resolves to null (rather than throwing) when Mailgun is not
      // configured. leadGuidebookEnabled already covers that, but if the two ever
      // drift apart, treat it as not-sent and release the claim — otherwise the
      // row would read "sent" for mail that never left.
      if (!result) {
        await supabaseAdmin
          .from('landing_quiz_submissions')
          .update({ welcome_email_sent_at: null })
          .eq('id', row.id)
        appLog.warn('lead_guidebook.mailer_disabled', { reqId: args.reqId, email: args.email })
        return 'skipped_disabled'
      }

      // Store the Mailgun id so the delivery webhook can attribute bounces and
      // complaints back to this row via welcome_email_mailgun_id.
      await supabaseAdmin
        .from('landing_quiz_submissions')
        .update({ welcome_email_mailgun_id: result.id, welcome_email_error: null })
        .eq('id', row.id)

      appLog.info('lead_guidebook.sent', {
        reqId: args.reqId,
        email: args.email,
        landing: args.landing,
        mailgunId: result.id,
      })
      return 'sent'
    } catch (sendErr) {
      // Release the claim so a later submit can retry: the promise is unfulfilled,
      // and leaving it claimed would silently strand this lead forever.
      const message = sendErr instanceof Error ? sendErr.message : String(sendErr)
      await supabaseAdmin
        .from('landing_quiz_submissions')
        .update({ welcome_email_sent_at: null, welcome_email_error: message.slice(0, 500) })
        .eq('id', row.id)

      appLog.error('lead_guidebook.send_failed', {
        reqId: args.reqId,
        email: args.email,
        error: message,
      })
      return 'failed'
    }
  } catch (err) {
    appLog.error('lead_guidebook.unexpected', {
      reqId: args.reqId,
      error: err instanceof Error ? err.message : String(err),
    })
    return 'failed'
  }
}

/**
 * Fire-and-forget wrapper for the request path.
 *
 * The visitor is mid-quiz; they must not wait on Mailgun, and a mail failure must
 * not fail their submission. Errors are swallowed by sendLeadGuidebookEmail itself.
 */
export function sendLeadGuidebookEmailAsync(args: {
  email: string
  name?: string | null
  landing: string
  reqId?: string
}): void {
  void sendLeadGuidebookEmail(args)
}
