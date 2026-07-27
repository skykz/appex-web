import type { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'
import { isUuid } from '../../utils/admin-search.js'

/** Row caps per section — a detail page needs recent history, not the full archive. */
const RECENT_LIMIT = 25
const TIMELINE_LIMIT = 50

/** Coerces Supabase numerics (which arrive as strings) to numbers for JSON output. */
function toNum(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

/**
 * Returns a single user's full admin-facing profile: identity, subscription,
 * payments, refunds, learning progress, engagement, and comms history.
 *
 * All of this data already existed across a dozen tables but was only reachable
 * by pasting an email into three separate list pages. Queries are batched per
 * section (never per row) and each history section is capped.
 */
export async function getAdminUserDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = String(req.params.id)
    if (!isUuid(userId)) throw new AppError(400, 'Invalid user id')

    const { data: user, error: uErr } = await supabaseAdmin
      .from('users')
      .select(
        'id, email, name, avatar_url, role, created_at, updated_at, courtesy_refund_used, is_eu_resident, country_code'
      )
      .eq('id', userId)
      .maybeSingle()
    if (uErr) throw new AppError(500, uErr.message)
    if (!user) throw new AppError(404, 'User not found')

    // Every section is independent, so fetch them concurrently.
    const [
      subscription,
      credits,
      streak,
      payments,
      refunds,
      skillProgress,
      lessonProgress,
      submissions,
      certificates,
      quizAttempts,
      contactMessages,
      emailLog,
      streakDays,
      lessonOpens,
    ] = await Promise.all([
      supabaseAdmin
        .from('subscriptions')
        .select(
          'id, plan_name, status, intro_price, price, renewal_date, paused_at, created_at, stripe_customer_id, stripe_subscription_id, stripe_price_id, billing_interval, cancel_at_period_end, current_period_start, current_period_end, trial_end, currency'
        )
        .eq('user_id', userId)
        .maybeSingle(),
      supabaseAdmin.from('user_credits').select('balance, updated_at').eq('user_id', userId).maybeSingle(),
      supabaseAdmin
        .from('streaks')
        .select('current, best, milestone, last_active_date, updated_at')
        .eq('user_id', userId)
        .maybeSingle(),
      supabaseAdmin
        .from('billing_history')
        .select('id, amount, subtotal, discount_amount, coupon_label, promo_code, description, paid_at')
        .eq('user_id', userId)
        .order('paid_at', { ascending: false })
        .limit(RECENT_LIMIT),
      supabaseAdmin
        .from('refund_requests')
        .select('id, decision, reason_code, reason_detail, stripe_refund_id, courtesy_applied, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(RECENT_LIMIT),
      supabaseAdmin
        .from('skill_progress')
        .select('skill_id, progress, status, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false }),
      supabaseAdmin
        .from('lesson_progress')
        .select('lesson_id, step_index, completed, rating, feedback, completed_at')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false, nullsFirst: false })
        .limit(TIMELINE_LIMIT),
      supabaseAdmin
        .from('lesson_submissions')
        .select('id, lesson_id, message, status, grade, admin_feedback, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(RECENT_LIMIT),
      supabaseAdmin
        .from('certificates')
        .select('id, cert_code, skill_id, course_title, issued_at')
        .eq('user_id', userId)
        .order('issued_at', { ascending: false }),
      supabaseAdmin
        .from('lesson_quiz_attempts')
        .select('id, lesson_id, step_index, block_index, is_correct, open_response, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(TIMELINE_LIMIT),
      supabaseAdmin
        .from('contact_messages')
        .select('id, subject, category, read_at, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(RECENT_LIMIT),
      supabaseAdmin
        .from('user_email_log')
        .select('id, email_type, mailgun_id, period_end, scheduled_for, sent_at')
        .eq('user_id', userId)
        .order('sent_at', { ascending: false })
        .limit(TIMELINE_LIMIT),
      supabaseAdmin
        .from('streak_days')
        .select('date')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(120),
      supabaseAdmin
        .from('lesson_open_events')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
    ])

    // Surface the first hard failure rather than silently returning partial data.
    for (const r of [
      subscription,
      credits,
      streak,
      payments,
      refunds,
      skillProgress,
      lessonProgress,
      submissions,
      certificates,
      quizAttempts,
      contactMessages,
      emailLog,
      streakDays,
      lessonOpens,
    ]) {
      if (r.error) throw new AppError(500, r.error.message)
    }

    // Resolve human-readable titles for the numeric skill/lesson ids above.
    const skillIds = [
      ...new Set([
        ...(skillProgress.data ?? []).map((r) => r.skill_id as number),
        ...(certificates.data ?? []).map((r) => r.skill_id as number),
      ]),
    ]
    const lessonIds = [
      ...new Set([
        ...(lessonProgress.data ?? []).map((r) => r.lesson_id as number),
        ...(submissions.data ?? []).map((r) => r.lesson_id as number),
        ...(quizAttempts.data ?? []).map((r) => r.lesson_id as number),
      ]),
    ]

    const [skills, lessons] = await Promise.all([
      skillIds.length
        ? supabaseAdmin.from('skills').select('id, title').in('id', skillIds)
        : Promise.resolve({ data: [], error: null }),
      lessonIds.length
        ? supabaseAdmin.from('lessons').select('id, title, label').in('id', lessonIds)
        : Promise.resolve({ data: [], error: null }),
    ])
    if (skills.error) throw new AppError(500, skills.error.message)
    if (lessons.error) throw new AppError(500, lessons.error.message)

    const skillTitle = new Map((skills.data ?? []).map((s) => [s.id as number, s.title as string]))
    const lessonInfo = new Map(
      (lessons.data ?? []).map((l) => [
        l.id as number,
        { title: l.title as string, label: l.label as string },
      ])
    )

    const sub = subscription.data

    res.json({
      user: {
        id: user.id as string,
        email: user.email as string,
        name: (user.name as string | null) ?? null,
        avatar_url: (user.avatar_url as string | null) ?? null,
        role: user.role as string,
        created_at: user.created_at as string,
        updated_at: (user.updated_at as string | null) ?? null,
        courtesy_refund_used: Boolean(user.courtesy_refund_used),
        is_eu_resident: Boolean(user.is_eu_resident),
        country_code: (user.country_code as string | null) ?? null,
      },
      subscription: sub
        ? {
            id: sub.id as string,
            plan_name: sub.plan_name as string,
            status: sub.status as string,
            intro_price: sub.intro_price != null ? toNum(sub.intro_price) : null,
            price: toNum(sub.price),
            renewal_date: sub.renewal_date as string,
            paused_at: (sub.paused_at as string | null) ?? null,
            created_at: sub.created_at as string,
            stripe_customer_id: (sub.stripe_customer_id as string | null) ?? null,
            stripe_subscription_id: (sub.stripe_subscription_id as string | null) ?? null,
            stripe_price_id: (sub.stripe_price_id as string | null) ?? null,
            billing_interval: (sub.billing_interval as string | null) ?? null,
            cancel_at_period_end: Boolean(sub.cancel_at_period_end),
            current_period_start: (sub.current_period_start as string | null) ?? null,
            current_period_end: (sub.current_period_end as string | null) ?? null,
            trial_end: (sub.trial_end as string | null) ?? null,
            currency: (sub.currency as string | null) ?? null,
          }
        : null,
      engagement: {
        credits: credits.data?.balance != null ? Number(credits.data.balance) : 0,
        streak_current: streak.data?.current != null ? Number(streak.data.current) : 0,
        streak_best: streak.data?.best != null ? Number(streak.data.best) : 0,
        last_active_date: (streak.data?.last_active_date as string | null) ?? null,
        lessons_opened_total: lessonOpens.count ?? 0,
        active_days: (streakDays.data ?? []).map((d) => d.date as string),
      },
      payments: (payments.data ?? []).map((p) => ({
        id: p.id as string,
        amount: toNum(p.amount),
        subtotal: p.subtotal != null ? toNum(p.subtotal) : null,
        discount_amount: toNum(p.discount_amount),
        coupon_label: (p.coupon_label as string | null) ?? null,
        promo_code: (p.promo_code as string | null) ?? null,
        description: p.description as string,
        paid_at: p.paid_at as string,
      })),
      refunds: (refunds.data ?? []).map((r) => ({
        id: r.id as string,
        decision: r.decision as string,
        reason_code: r.reason_code as string,
        reason_detail: (r.reason_detail as string | null) ?? null,
        stripe_refund_id: (r.stripe_refund_id as string | null) ?? null,
        courtesy_applied: Boolean(r.courtesy_applied),
        created_at: r.created_at as string,
      })),
      courses: (skillProgress.data ?? []).map((s) => ({
        skill_id: s.skill_id as number,
        title: skillTitle.get(s.skill_id as number) ?? `Course #${s.skill_id}`,
        progress: Number(s.progress),
        status: s.status as string,
        updated_at: s.updated_at as string,
      })),
      lessons: (lessonProgress.data ?? []).map((l) => ({
        lesson_id: l.lesson_id as number,
        title: lessonInfo.get(l.lesson_id as number)?.title ?? `Lesson #${l.lesson_id}`,
        label: lessonInfo.get(l.lesson_id as number)?.label ?? null,
        step_index: Number(l.step_index),
        completed: Boolean(l.completed),
        rating: l.rating != null ? Number(l.rating) : null,
        feedback: (l.feedback as string | null) ?? null,
        completed_at: (l.completed_at as string | null) ?? null,
      })),
      submissions: (submissions.data ?? []).map((s) => ({
        id: s.id as string,
        lesson_id: s.lesson_id as number,
        lesson_title: lessonInfo.get(s.lesson_id as number)?.title ?? `Lesson #${s.lesson_id}`,
        message: (s.message as string | null) ?? null,
        status: s.status as string,
        grade: (s.grade as string | null) ?? null,
        admin_feedback: (s.admin_feedback as string | null) ?? null,
        created_at: s.created_at as string,
      })),
      quiz_attempts: (quizAttempts.data ?? []).map((q) => ({
        id: q.id as string,
        lesson_id: q.lesson_id as number,
        lesson_title: lessonInfo.get(q.lesson_id as number)?.title ?? `Lesson #${q.lesson_id}`,
        step_index: Number(q.step_index),
        block_index: Number(q.block_index),
        is_correct: q.is_correct == null ? null : Boolean(q.is_correct),
        open_response: (q.open_response as string | null) ?? null,
        created_at: q.created_at as string,
      })),
      certificates: (certificates.data ?? []).map((c) => ({
        id: c.id as string,
        cert_code: c.cert_code as string,
        skill_id: c.skill_id as number,
        course_title: c.course_title as string,
        issued_at: c.issued_at as string,
      })),
      support_messages: (contactMessages.data ?? []).map((m) => ({
        id: m.id as string,
        subject: m.subject as string,
        category: (m.category as string | null) ?? 'general',
        read_at: (m.read_at as string | null) ?? null,
        created_at: m.created_at as string,
      })),
      emails: (emailLog.data ?? []).map((e) => ({
        id: e.id as string,
        email_type: e.email_type as string,
        mailgun_id: (e.mailgun_id as string | null) ?? null,
        period_end: (e.period_end as string | null) ?? null,
        scheduled_for: (e.scheduled_for as string | null) ?? null,
        sent_at: e.sent_at as string,
      })),
    })
  } catch (err) {
    next(err)
  }
}
