/**
 * Lead email confirmation (double opt-in) for funnel leads.
 *
 * Why this is separate from lifecycle-email.service.ts: every lifecycle email is
 * keyed to a `users` row and deduped via `user_email_log.user_id`. A quiz lead has
 * no account yet — that is the point — so neither mechanism applies. State lives on
 * the `landing_quiz_submissions` row (migration 041).
 *
 * Gated on Mailgun being configured, and on nothing else: unlike the guidebook
 * email, confirmation promises only what already exists, so it needs no asset and
 * can ship today.
 */

import { randomBytes, createHash, timingSafeEqual } from 'node:crypto'
import { supabaseAdmin } from '../db/supabase.js'
import { env } from '../config/env.js'
import { firstNameFrom } from './email-templates/layout.js'
import { renderLeadConfirmEmail } from './email-templates/lead-confirm.js'
import { sendEmail } from './email.service.js'
import { appLog } from '../lib/logger.js'

/** How long an emailed confirm link stays valid. Matches the email's copy. */
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Delay before the confirmation email lands, handed to Mailgun as `deliveryTime`
 * rather than implemented with a timer: this runs on Vercel, where the process is
 * frozen right after the response, so any in-process wait would simply never fire.
 */
const SEND_DELAY_MS = 10 * 60 * 1000

/**
 * Don't re-send a confirmation more than once per this window.
 *
 * MUST stay comfortably longer than SEND_DELAY_MS. The quiz re-submits on every
 * step, and the cooldown is measured from when we *scheduled* the mail — if the
 * two were equal, a lead still answering questions ten minutes later would fall
 * just outside the cooldown and get a second, duplicate email.
 */
const RESEND_COOLDOWN_MS = 30 * 60 * 1000

export type SendConfirmResult =
  | 'sent'
  | 'skipped_disabled'
  | 'skipped_already_confirmed'
  | 'skipped_cooldown'
  | 'skipped_no_row'
  | 'failed'

export type ConfirmResult =
  | { status: 'confirmed'; email: string }
  | { status: 'already_confirmed'; email: string }
  | { status: 'invalid' }
  | { status: 'expired' }

/**
 * Builds the public confirm URL the email links to.
 *
 * Points at the landing (not the app): the visitor has no account, so sending them
 * to the learner platform would dead-end on a login screen.
 */
function buildConfirmUrl(token: string): string {
  const base = env.USA_LANDING_URL.replace(/\/$/, '')
  return `${base}/confirm-email?token=${encodeURIComponent(token)}`
}

/**
 * Sends (or re-sends) the confirmation email for one lead.
 *
 * Never throws: this runs off the back of a quiz submission, and a mail failure
 * must not turn a captured lead into a 500 for the visitor.
 *
 * `immediate` exists for the admin "resend" button. An operator clicking send is a
 * deliberate one-off, not the quiz firing on every step, so there is nothing to
 * rate limit and nothing gained by making them wait ten minutes to see whether it
 * worked. The automatic path keeps both the delay and the cooldown.
 */
export async function sendLeadConfirmEmail(args: {
  email: string
  name?: string | null
  landing: string
  reqId?: string
  /** Skip the send delay and the resend cooldown (admin-triggered send). */
  immediate?: boolean
}): Promise<SendConfirmResult> {
  if (!env.mailgunEnabled) return 'skipped_disabled'

  try {
    // Scoped by landing because (email, landing) is the unique key — without the
    // filter maybeSingle() throws once a second landing exists.
    const { data: row, error: readErr } = await supabaseAdmin
      .from('landing_quiz_submissions')
      .select('id, name, confirmed_at, confirm_email_sent_at')
      .eq('email', args.email)
      .eq('landing', args.landing)
      .maybeSingle()

    if (readErr) {
      appLog.error('lead_confirm.read_failed', { reqId: args.reqId, error: readErr.message })
      return 'failed'
    }
    if (!row) return 'skipped_no_row'
    if (row.confirmed_at) return 'skipped_already_confirmed'

    // The quiz re-submits on every step, so without a cooldown one lead would get
    // a burst of identical confirmation emails. An admin-triggered send bypasses
    // this: the operator asked for exactly one email, on purpose.
    if (!args.immediate && row.confirm_email_sent_at) {
      const age = Date.now() - new Date(row.confirm_email_sent_at).getTime()
      if (age < RESEND_COOLDOWN_MS) return 'skipped_cooldown'
    }

    // Only the hash is stored, so a database read cannot be turned into a working
    // confirm link — same reasoning as storing password hashes rather than passwords.
    const rawToken = randomBytes(32).toString('base64url')
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')
    const now = new Date()
    const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS)

    // Claim the send before calling Mailgun: on a crash mid-send we would rather
    // skip one email than mail the same person repeatedly.
    const { data: claimed, error: claimErr } = await supabaseAdmin
      .from('landing_quiz_submissions')
      .update({
        confirm_token: tokenHash,
        confirm_token_expires_at: expiresAt.toISOString(),
        confirm_email_sent_at: now.toISOString(),
      })
      .eq('id', row.id)
      // Guards the concurrent case: whichever request updates first wins, and the
      // losers see a fresh confirm_email_sent_at and bail on the cooldown above.
      .is('confirmed_at', null)
      .select('id')
      .maybeSingle()

    if (claimErr) {
      appLog.error('lead_confirm.claim_failed', { reqId: args.reqId, error: claimErr.message })
      return 'failed'
    }
    if (!claimed) return 'skipped_already_confirmed'

    const { subject, html, text } = renderLeadConfirmEmail({
      firstName: firstNameFrom(args.name?.trim() || row.name?.trim() || ''),
      confirmUrl: buildConfirmUrl(rawToken),
    })

    try {
      const result = await sendEmail({
        to: args.email,
        subject,
        html,
        text,
        tag: 'lead-confirm',
        // Marketing mail to a non-account holder: an unsubscribe path is required.
        listUnsubscribeMailto: env.MAILGUN_REPLY_TO ?? undefined,
        // Mailgun holds the message and delivers it later, so the delay survives
        // the request ending — unlike a timer in this process. Omitted entirely for
        // an admin send: passing a past date would be rejected, not treated as "now".
        ...(args.immediate ? {} : { deliveryTime: new Date(now.getTime() + SEND_DELAY_MS) }),
      })

      // sendEmail resolves to null (rather than throwing) when Mailgun is off.
      // Release the send marker so a later submit retries, otherwise the row would
      // read "emailed" for mail that never left.
      if (!result) {
        await supabaseAdmin
          .from('landing_quiz_submissions')
          .update({ confirm_email_sent_at: null })
          .eq('id', row.id)
        appLog.warn('lead_confirm.mailer_disabled', { reqId: args.reqId, email: args.email })
        return 'skipped_disabled'
      }

      appLog.info('lead_confirm.sent', {
        reqId: args.reqId,
        email: args.email,
        landing: args.landing,
        mailgunId: result.id,
      })
      return 'sent'
    } catch (sendErr) {
      // Release the marker so the lead is not stranded un-emailed forever.
      const message = sendErr instanceof Error ? sendErr.message : String(sendErr)
      await supabaseAdmin
        .from('landing_quiz_submissions')
        .update({ confirm_email_sent_at: null })
        .eq('id', row.id)

      appLog.error('lead_confirm.send_failed', {
        reqId: args.reqId,
        email: args.email,
        error: message,
      })
      return 'failed'
    }
  } catch (err) {
    appLog.error('lead_confirm.unexpected', {
      reqId: args.reqId,
      error: err instanceof Error ? err.message : String(err),
    })
    return 'failed'
  }
}

/**
 * Fire-and-forget wrapper for the request path: the visitor is mid-quiz and must
 * not wait on Mailgun. Errors are swallowed by sendLeadConfirmEmail itself.
 */
export function sendLeadConfirmEmailAsync(args: {
  email: string
  name?: string | null
  landing: string
  reqId?: string
}): void {
  void sendLeadConfirmEmail(args)
}

/**
 * Redeems a confirmation token.
 *
 * Single-use: the token is cleared on success, so a forwarded link (or one sitting
 * in a proxy log) cannot be replayed. Returns a coarse status only — the caller
 * must not reveal whether an address exists.
 */
export async function confirmLeadEmail(args: {
  token: string
  reqId?: string
}): Promise<ConfirmResult> {
  const raw = args.token?.trim()
  if (!raw || raw.length > 200) return { status: 'invalid' }

  try {
    const tokenHash = createHash('sha256').update(raw).digest('hex')

    const { data: row, error } = await supabaseAdmin
      .from('landing_quiz_submissions')
      .select('id, email, confirm_token, confirm_token_expires_at, confirmed_at')
      .eq('confirm_token', tokenHash)
      .maybeSingle()

    if (error) {
      appLog.error('lead_confirm.lookup_failed', { reqId: args.reqId, error: error.message })
      return { status: 'invalid' }
    }
    if (!row) return { status: 'invalid' }

    // Compare again in constant time. The lookup above already matched on the
    // hash, so this is belt-and-braces against a future non-exact match path.
    const stored = Buffer.from(String(row.confirm_token), 'utf8')
    const given = Buffer.from(tokenHash, 'utf8')
    if (stored.length !== given.length || !timingSafeEqual(stored, given)) {
      return { status: 'invalid' }
    }

    if (row.confirmed_at) return { status: 'already_confirmed', email: row.email }

    const expiresAt = row.confirm_token_expires_at
      ? new Date(row.confirm_token_expires_at).getTime()
      : 0
    if (!expiresAt || expiresAt < Date.now()) return { status: 'expired' }

    const { data: updated, error: updErr } = await supabaseAdmin
      .from('landing_quiz_submissions')
      .update({
        confirmed_at: new Date().toISOString(),
        // Clear the token so the link is single-use.
        confirm_token: null,
        confirm_token_expires_at: null,
      })
      .eq('id', row.id)
      .is('confirmed_at', null)
      .select('email')
      .maybeSingle()

    if (updErr) {
      appLog.error('lead_confirm.update_failed', { reqId: args.reqId, error: updErr.message })
      return { status: 'invalid' }
    }
    // Lost a concurrent double-click; the other request confirmed it.
    if (!updated) return { status: 'already_confirmed', email: row.email }

    appLog.info('lead_confirm.confirmed', { reqId: args.reqId, email: updated.email })
    return { status: 'confirmed', email: updated.email }
  } catch (err) {
    appLog.error('lead_confirm.unexpected', {
      reqId: args.reqId,
      error: err instanceof Error ? err.message : String(err),
    })
    return { status: 'invalid' }
  }
}
