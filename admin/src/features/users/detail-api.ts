import { httpClient } from '@shared/api/http-client'

export interface AdminUserDetailProfile {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  role: string
  created_at: string
  updated_at: string | null
  courtesy_refund_used: boolean
  is_eu_resident: boolean
  country_code: string | null
}

export interface AdminUserSubscription {
  id: string
  plan_name: string
  status: string
  intro_price: number | null
  price: number
  renewal_date: string
  paused_at: string | null
  created_at: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  billing_interval: string | null
  cancel_at_period_end: boolean
  current_period_start: string | null
  current_period_end: string | null
  trial_end: string | null
  currency: string | null
}

export interface AdminUserDetail {
  user: AdminUserDetailProfile
  subscription: AdminUserSubscription | null
  engagement: {
    credits: number
    streak_current: number
    streak_best: number
    last_active_date: string | null
    lessons_opened_total: number
    active_days: string[]
  }
  payments: Array<{
    id: string
    amount: number
    subtotal: number | null
    discount_amount: number
    coupon_label: string | null
    promo_code: string | null
    description: string
    paid_at: string
  }>
  refunds: Array<{
    id: string
    decision: string
    reason_code: string
    reason_detail: string | null
    stripe_refund_id: string | null
    courtesy_applied: boolean
    created_at: string
  }>
  courses: Array<{
    skill_id: number
    title: string
    progress: number
    status: string
    updated_at: string
  }>
  lessons: Array<{
    lesson_id: number
    title: string
    label: string | null
    step_index: number
    completed: boolean
    rating: number | null
    feedback: string | null
    completed_at: string | null
  }>
  submissions: Array<{
    id: string
    lesson_id: number
    lesson_title: string
    message: string | null
    status: string
    grade: string | null
    admin_feedback: string | null
    created_at: string
  }>
  quiz_attempts: Array<{
    id: string
    lesson_id: number
    lesson_title: string
    step_index: number
    block_index: number
    is_correct: boolean | null
    open_response: string | null
    created_at: string
  }>
  certificates: Array<{
    id: string
    cert_code: string
    skill_id: number
    course_title: string
    issued_at: string
  }>
  support_messages: Array<{
    id: string
    subject: string
    category: string
    read_at: string | null
    created_at: string
  }>
  emails: Array<{
    id: string
    email_type: string
    mailgun_id: string | null
    period_end: string | null
    scheduled_for: string | null
    sent_at: string
  }>
}

/**
 * Fetches one user's complete admin profile across identity, billing, learning,
 * and comms — the data that previously required checking three separate pages.
 */
export async function fetchAdminUserDetail(id: string): Promise<AdminUserDetail> {
  return httpClient.get<AdminUserDetail>(`/admin/users/${id}`)
}
