import { supabaseAdmin } from '../db/supabase.js'
import { renderAccessLockedEmail } from './email-templates/access-locked.js'
import { renderCancellationConfirmedEmail } from './email-templates/cancellation-confirmed.js'
import { renderPaymentFailedNoticeEmail } from './email-templates/payment-failed-notice.js'
import { renderPaymentSuccessEmail } from './email-templates/payment-success.js'
import { renderRenewalReminderEmail } from './email-templates/renewal-reminder.js'
import { renderSubscriptionExpiredEmail } from './email-templates/subscription-expired.js'
import { renderWelcomeEmail } from './email-templates/welcome.js'
import { firstNameFrom } from './email-templates/layout.js'
import { sendEmail } from './email.service.js'
import { generateMagicLinkUrl } from './magic-link.service.js'
import { PAYMENT_GRACE_PERIOD_MS } from './subscription-access.js'
import {
  RENEWAL_24H_CRON_WINDOW_MS,
  RENEWAL_REMINDER_24H_MS,
  RENEWAL_REMINDER_3_DAYS,
} from './subscription-billing.constants.js'

const WELCOME_DELAY_MS = 60_000

type LifecycleEmailType =
  | 'payment_success'
  | 'welcome'
  | 'renewal_reminder'
  | 'renewal_reminder_24h'
  | 'payment_failed_notice'
  | 'access_locked'
  | 'cancellation_confirmed'
  | 'subscription_expired'

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
  if (emailType === 'renewal_reminder_24h' && periodEnd) {
    query = query.eq('period_end', periodEnd)
  }
  if (emailType === 'access_locked' && periodEnd) {
    query = query.eq('period_end', periodEnd)
  }
  if (emailType === 'payment_failed_notice' && periodEnd) {
    query = query.eq('period_end', periodEnd)
  }
  if (emailType === 'cancellation_confirmed' && periodEnd) {
    query = query.eq('period_end', periodEnd)
  }
  if (emailType === 'subscription_expired' && periodEnd) {
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
 * Sends E1 (payment success + magic link) and schedules E2 welcome after USA payment-first checkout.
 */
export async function sendPostPaymentEmails(args: {
  userId: string
  email: string
  name: string
}): Promise<void> {
  const firstName = firstNameFrom(args.name)
  const normalizedEmail = args.email.trim().toLowerCase()

  await linkQuizSubmissionToUser(args.userId, args.email)

  if (!(await hasSentEmail(args.userId, 'payment_success'))) {
    const magicLink = await generateMagicLinkUrl(normalizedEmail)
    const e1 = renderPaymentSuccessEmail(magicLink ?? undefined)
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
 * Fire-and-forget wrapper for post-payment lifecycle emails after Stripe webhook provisioning.
 */
export function sendPostPaymentEmailsAsync(args: {
  userId: string
  email: string
  name: string
}): void {
  void (async () => {
    try {
      await sendPostPaymentEmails(args)
    } catch (err) {
      console.error('[lifecycle-email] post-payment emails failed', args.email, err)
    }
  })()
}

/**
 * Sends E2 welcome email after manual password signup (payment email is sent after checkout).
 */
export async function sendPostSignupEmails(args: {
  userId: string
  email: string
  name: string
}): Promise<void> {
  const firstName = firstNameFrom(args.name)
  const normalizedEmail = args.email.trim().toLowerCase()

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
  return sendRenewalRemindersForLeadTime({
    leadTimeMs: RENEWAL_REMINDER_3_DAYS * 24 * 60 * 60 * 1000,
    windowMs: 24 * 60 * 60 * 1000,
    emailType: 'renewal_reminder',
    leadTimeLabel: '3 days',
    sentColumn: 'renewal_reminder_sent_for_period_end',
    mailgunTag: 'e3-renewal-reminder-3d',
  })
}

/**
 * Sends E4 renewal reminders ~24 hours before current_period_end (hourly cron).
 */
export async function processDueRenewalReminders24h(): Promise<{ sent: number }> {
  return sendRenewalRemindersForLeadTime({
    leadTimeMs: RENEWAL_REMINDER_24H_MS,
    windowMs: RENEWAL_24H_CRON_WINDOW_MS,
    emailType: 'renewal_reminder_24h',
    leadTimeLabel: '24 hours',
    sentColumn: 'renewal_reminder_24h_sent_for_period_end',
    mailgunTag: 'e4-renewal-reminder-24h',
  })
}

/**
 * Sends renewal reminder emails for subscriptions whose period end falls in the lead-time window.
 */
async function sendRenewalRemindersForLeadTime(args: {
  leadTimeMs: number
  windowMs: number
  emailType: Extract<LifecycleEmailType, 'renewal_reminder' | 'renewal_reminder_24h'>
  leadTimeLabel: string
  sentColumn: 'renewal_reminder_sent_for_period_end' | 'renewal_reminder_24h_sent_for_period_end'
  mailgunTag: string
}): Promise<{ sent: number }> {
  const now = Date.now()
  const windowStart = new Date(now + args.leadTimeMs - args.windowMs / 2)
  const windowEnd = new Date(now + args.leadTimeMs + args.windowMs / 2)

  const { data: rows, error } = await supabaseAdmin
    .from('subscriptions')
    .select(
      `user_id, current_period_end, price, currency, status, cancel_at_period_end, ${args.sentColumn}`
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
    if (row[args.sentColumn as keyof typeof row] === periodEnd) continue

    const userId = row.user_id as string
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('email, name')
      .eq('id', userId)
      .maybeSingle()

    if (!profile?.email) continue
    if (await hasSentEmail(userId, args.emailType, periodEnd)) continue

    const amount = (row.price as number) ?? 0

    const email = renderRenewalReminderEmail({
      firstName: firstNameFrom(profile.name ?? ''),
      renewalDateIso: periodEnd,
      amount,
      currency: (row.currency as string) ?? 'usd',
      leadTimeLabel: args.leadTimeLabel,
    })

    const result = await sendEmail({
      to: profile.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      tag: args.mailgunTag,
    })

    if (!result) continue

    await logEmailSent({
      userId,
      emailType: args.emailType,
      mailgunId: result.id,
      periodEnd,
    })

    await supabaseAdmin
      .from('subscriptions')
      .update({ [args.sentColumn]: periodEnd })
      .eq('user_id', userId)

    sent++
  }

  return { sent }
}

/**
 * Sends access-locked emails when the 24h payment grace window expires without recovery.
 */
export async function processGraceExpiredAccessLocks(): Promise<{ sent: number }> {
  const cutoff = new Date(Date.now() - PAYMENT_GRACE_PERIOD_MS).toISOString()

  const { data: rows, error } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id, current_period_end, payment_failed_at, payment_failed_count')
    .eq('status', 'past_due')
    .eq('payment_failed_count', 1)
    .lt('payment_failed_at', cutoff)

  if (error) {
    throw new Error(error.message)
  }

  let sent = 0

  for (const row of rows ?? []) {
    const userId = row.user_id as string
    const periodEnd = (row.current_period_end as string | null) ?? row.payment_failed_at
    if (!periodEnd) continue
    if (await hasSentEmail(userId, 'access_locked', periodEnd)) continue

    const ok = await sendAccessLockedEmailForUser(userId, periodEnd)
    if (ok) sent++
  }

  return { sent }
}

/**
 * Notifies the user that a renewal payment failed (first attempt — retry pending).
 */
export async function sendPaymentFailedNoticeForUser(
  userId: string,
  periodEnd: string | null
): Promise<boolean> {
  if (periodEnd && (await hasSentEmail(userId, 'payment_failed_notice', periodEnd))) {
    return false
  }

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('email, name')
    .eq('id', userId)
    .maybeSingle()

  if (!profile?.email) return false

  const email = renderPaymentFailedNoticeEmail({
    firstName: firstNameFrom(profile.name ?? ''),
  })

  const result = await sendEmail({
    to: profile.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
    tag: 'payment-failed-notice',
  })

  if (!result) return false

  await logEmailSent({
    userId,
    emailType: 'payment_failed_notice',
    mailgunId: result.id,
    periodEnd,
  })

  return true
}

/**
 * Notifies the user that premium access is locked after a failed payment retry.
 */
export async function sendAccessLockedEmailForUser(
  userId: string,
  periodEnd: string | null
): Promise<boolean> {
  if (periodEnd && (await hasSentEmail(userId, 'access_locked', periodEnd))) {
    return false
  }

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('email, name')
    .eq('id', userId)
    .maybeSingle()

  if (!profile?.email) return false

  const email = renderAccessLockedEmail({
    firstName: firstNameFrom(profile.name ?? ''),
  })

  const result = await sendEmail({
    to: profile.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
    tag: 'access-locked',
  })

  if (!result) return false

  await logEmailSent({
    userId,
    emailType: 'access_locked',
    mailgunId: result.id,
    periodEnd,
  })

  return true
}

/**
 * Fire-and-forget payment-failed notice after the first invoice failure in a billing cycle.
 */
export function sendPaymentFailedNoticeAsync(
  userId: string,
  periodEnd: string | null
): void {
  void (async () => {
    try {
      await sendPaymentFailedNoticeForUser(userId, periodEnd)
    } catch (err) {
      console.error('[lifecycle-email] payment failed notice error', userId, err)
    }
  })()
}

/**
 * Fire-and-forget access-locked email after retry failure or grace expiry.
 */
export function sendAccessLockedEmailAsync(
  userId: string,
  periodEnd: string | null
): void {
  void (async () => {
    try {
      await sendAccessLockedEmailForUser(userId, periodEnd)
    } catch (err) {
      console.error('[lifecycle-email] access locked email error', userId, err)
    }
  })()
}

/**
 * Sends cancellation confirmation after the user schedules cancel at period end.
 */
export async function sendCancellationConfirmedForUser(
  userId: string,
  accessUntilIso: string
): Promise<boolean> {
  if (await hasSentEmail(userId, 'cancellation_confirmed', accessUntilIso)) {
    return false
  }

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('email, name')
    .eq('id', userId)
    .maybeSingle()

  if (!profile?.email) return false

  const email = renderCancellationConfirmedEmail({
    firstName: firstNameFrom(profile.name ?? ''),
    accessUntilIso,
  })

  const result = await sendEmail({
    to: profile.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
    tag: 'cancellation-confirmed',
  })

  if (!result) return false

  await logEmailSent({
    userId,
    emailType: 'cancellation_confirmed',
    mailgunId: result.id,
    periodEnd: accessUntilIso,
  })

  return true
}

/**
 * Fire-and-forget cancellation confirmation email.
 */
export function sendCancellationConfirmedAsync(
  userId: string,
  accessUntilIso: string
): void {
  void (async () => {
    try {
      await sendCancellationConfirmedForUser(userId, accessUntilIso)
    } catch (err) {
      console.error('[lifecycle-email] cancellation confirmed error', userId, err)
    }
  })()
}

/**
 * Sends subscription-expired notice when a scheduled cancellation reaches period end.
 */
export async function sendSubscriptionExpiredForUser(
  userId: string,
  periodEnd: string | null
): Promise<boolean> {
  if (periodEnd && (await hasSentEmail(userId, 'subscription_expired', periodEnd))) {
    return false
  }

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('email, name')
    .eq('id', userId)
    .maybeSingle()

  if (!profile?.email) return false

  const email = renderSubscriptionExpiredEmail({
    firstName: firstNameFrom(profile.name ?? ''),
  })

  const result = await sendEmail({
    to: profile.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
    tag: 'subscription-expired',
  })

  if (!result) return false

  await logEmailSent({
    userId,
    emailType: 'subscription_expired',
    mailgunId: result.id,
    periodEnd,
  })

  return true
}

/**
 * Fire-and-forget subscription-expired email after period end.
 */
export function sendSubscriptionExpiredAsync(
  userId: string,
  periodEnd: string | null
): void {
  void (async () => {
    try {
      await sendSubscriptionExpiredForUser(userId, periodEnd)
    } catch (err) {
      console.error('[lifecycle-email] subscription expired error', userId, err)
    }
  })()
}

/**
 * Cron fallback: sends subscription-expired emails for user-initiated cancels whose period just ended.
 */
export async function processExpiredSubscriptionEmails(): Promise<{ sent: number }> {
  const nowIso = new Date().toISOString()
  const windowStart = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()

  const { data: rows, error } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id, current_period_end')
    .eq('status', 'canceled')
    .not('current_period_end', 'is', null)
    .gte('current_period_end', windowStart)
    .lt('current_period_end', nowIso)

  if (error) {
    throw new Error(error.message)
  }

  let sent = 0

  for (const row of rows ?? []) {
    const userId = row.user_id as string
    const periodEnd = row.current_period_end as string

    const { data: confirmed } = await supabaseAdmin
      .from('user_email_log')
      .select('id')
      .eq('user_id', userId)
      .eq('email_type', 'cancellation_confirmed')
      .eq('period_end', periodEnd)
      .limit(1)
      .maybeSingle()

    if (!confirmed) continue

    const ok = await sendSubscriptionExpiredForUser(userId, periodEnd)
    if (ok) sent++
  }

  return { sent }
}

/**
 * Runs all subscription lifecycle cron tasks (renewal reminders + grace expiry locks).
 */
export async function processSubscriptionLifecycleCron(): Promise<{
  renewal3d: number
  renewal24h: number
  graceLocks: number
  subscriptionExpired: number
}> {
  const [renewal3d, renewal24h, graceLocks, subscriptionExpired] = await Promise.all([
    processDueRenewalReminders(),
    processDueRenewalReminders24h(),
    processGraceExpiredAccessLocks(),
    processExpiredSubscriptionEmails(),
  ])

  return {
    renewal3d: renewal3d.sent,
    renewal24h: renewal24h.sent,
    graceLocks: graceLocks.sent,
    subscriptionExpired: subscriptionExpired.sent,
  }
}
