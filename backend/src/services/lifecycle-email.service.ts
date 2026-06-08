import { supabaseAdmin } from '../db/supabase.js'
import { renderPaymentSuccessEmail } from './email-templates/payment-success.js'
import { renderRenewalReminderEmail } from './email-templates/renewal-reminder.js'
import { renderWelcomeEmail } from './email-templates/welcome.js'
import { firstNameFrom } from './email-templates/layout.js'
import { sendEmail } from './email.service.js'

const WELCOME_DELAY_MS = 60_000
const RENEWAL_REMINDER_DAYS = 3

type LifecycleEmailType = 'payment_success' | 'welcome' | 'renewal_reminder'

/**
 * Returns true when this lifecycle email was already logged for the user.
 */
async function hasSentEmail(
  userId: string,
  emailType: LifecycleEmailType,
  periodEnd?: string | null
): Promise<boolean> {
  let query = supabaseAdmin
    .from('user_email_log')
    .select('id')
    .eq('user_id', userId)
    .eq('email_type', emailType)
    .limit(1)

  if (emailType === 'renewal_reminder' && periodEnd) {
    query = query.eq('period_end', periodEnd)
  }

  const { data, error } = await query.maybeSingle()
  if (error) {
    console.error('[lifecycle-email] log lookup failed', userId, emailType, error.message)
    return false
  }
  return Boolean(data)
}

/**
 * Persists a sent or scheduled lifecycle email for idempotency and auditing.
 */
async function logEmailSent(args: {
  userId: string
  emailType: LifecycleEmailType
  mailgunId: string | null
  scheduledFor?: Date | null
  periodEnd?: string | null
}): Promise<void> {
  const { error } = await supabaseAdmin.from('user_email_log').insert({
    user_id: args.userId,
    email_type: args.emailType,
    mailgun_id: args.mailgunId,
    scheduled_for: args.scheduledFor?.toISOString() ?? null,
    period_end: args.periodEnd ?? null,
  })

  if (error) {
    console.error('[lifecycle-email] failed to log', args.emailType, error.message)
  }
}

/**
 * Links a marketing quiz lead to the new user account by email.
 */
export async function linkQuizSubmissionToUser(
  userId: string,
  email: string
): Promise<void> {
  const normalized = email.trim().toLowerCase()
  const { error } = await supabaseAdmin
    .from('landing_quiz_submissions')
    .update({ user_id: userId, updated_at: new Date().toISOString() })
    .eq('email', normalized)
    .is('user_id', null)

  if (error) {
    console.error('[lifecycle-email] quiz link failed', userId, error.message)
  }
}

/**
 * Sends E1 immediately and schedules E2 for ~1 minute later (post-signup flow).
 */
export async function sendPostSignupEmails(args: {
  userId: string
  email: string
  name: string
}): Promise<void> {
  const firstName = firstNameFrom(args.name)
  const normalizedEmail = args.email.trim().toLowerCase()

  if (!(await hasSentEmail(args.userId, 'payment_success'))) {
    const e1 = renderPaymentSuccessEmail()
    const sent = await sendEmail({
      to: normalizedEmail,
      subject: e1.subject,
      html: e1.html,
      text: e1.text,
      tag: 'e1-payment-success',
    })
    if (sent) {
      await logEmailSent({
        userId: args.userId,
        emailType: 'payment_success',
        mailgunId: sent.id,
      })
    }
  }

  if (!(await hasSentEmail(args.userId, 'welcome'))) {
    const welcomeAt = new Date(Date.now() + WELCOME_DELAY_MS)
    const e2 = renderWelcomeEmail({ firstName, email: normalizedEmail })
    const scheduled = await sendEmail({
      to: normalizedEmail,
      subject: e2.subject,
      html: e2.html,
      text: e2.text,
      tag: 'e2-welcome',
      deliveryTime: welcomeAt,
    })
    if (scheduled) {
      await logEmailSent({
        userId: args.userId,
        emailType: 'welcome',
        mailgunId: scheduled.id,
        scheduledFor: welcomeAt,
      })
    }
  }
}

/**
 * Fire-and-forget wrapper so signup API responses are not blocked on Mailgun.
 */
export function sendPostSignupEmailsAsync(args: {
  userId: string
  email: string
  name: string
}): void {
  void (async () => {
    try {
      await linkQuizSubmissionToUser(args.userId, args.email)
      await sendPostSignupEmails(args)
    } catch (err) {
      console.error('[lifecycle-email] post-signup emails failed', args.email, err)
    }
  })()
}

/**
 * Sends E3 renewal reminders for subscriptions renewing in exactly 3 days (cron job).
 */
export async function processDueRenewalReminders(): Promise<{ sent: number }> {
  const now = new Date()
  const windowStart = new Date(now)
  windowStart.setUTCDate(windowStart.getUTCDate() + RENEWAL_REMINDER_DAYS)
  windowStart.setUTCHours(0, 0, 0, 0)

  const windowEnd = new Date(windowStart)
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 1)

  const { data: rows, error } = await supabaseAdmin
    .from('subscriptions')
    .select(
      'user_id, current_period_end, price, intro_price, currency, status, cancel_at_period_end, renewal_reminder_sent_for_period_end'
    )
    .in('status', ['active', 'trialing'])
    .eq('cancel_at_period_end', false)
    .gte('current_period_end', windowStart.toISOString())
    .lt('current_period_end', windowEnd.toISOString())

  if (error) {
    throw new Error(error.message)
  }

  let sent = 0

  for (const row of rows ?? []) {
    const periodEnd = row.current_period_end as string | null
    if (!periodEnd) continue
    if (row.renewal_reminder_sent_for_period_end === periodEnd) continue

    const userId = row.user_id as string
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('email, name')
      .eq('id', userId)
      .maybeSingle()

    if (!profile?.email) continue
    if (await hasSentEmail(userId, 'renewal_reminder', periodEnd)) continue

    const amount =
      typeof row.intro_price === 'number' && row.intro_price > 0
        ? row.intro_price
        : (row.price as number) ?? 0

    const e3 = renderRenewalReminderEmail({
      firstName: firstNameFrom(profile.name ?? ''),
      renewalDateIso: periodEnd,
      amount,
      currency: (row.currency as string) ?? 'usd',
    })

    const result = await sendEmail({
      to: profile.email,
      subject: e3.subject,
      html: e3.html,
      text: e3.text,
      tag: 'e3-renewal-reminder',
    })

    if (!result) continue

    await logEmailSent({
      userId,
      emailType: 'renewal_reminder',
      mailgunId: result.id,
      periodEnd,
    })

    await supabaseAdmin
      .from('subscriptions')
      .update({ renewal_reminder_sent_for_period_end: periodEnd })
      .eq('user_id', userId)

    sent++
  }

  return { sent }
}
