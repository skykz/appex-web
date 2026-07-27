import { httpClient } from '@shared/api/http-client'

export type RefundDecision = 'approved' | 'denied'

export type RefundReasonCode =
  | 'standard_7_day_no_engagement'
  | 'eu_14_day_no_completion'
  | 'courtesy_renewal_no_completion'
  | 'period_expired'
  | 'outside_refund_window'
  | 'lessons_completed'
  | 'lessons_opened'
  | 'courtesy_already_used'
  | 'not_renewal_charge'
  | 'billing_record_not_found'

/** Policy engine verdict for one prospective refund (no money moved yet). */
export interface RefundEvaluation {
  decision: RefundDecision
  reasonCode: RefundReasonCode
  reasonDetail: string
  daysSincePurchase: number
  lessonsOpened: number
  lessonsCompleted: number
  isRenewalCharge: boolean
  subscriptionPeriodExpired: boolean
  courtesyRefundUsed: boolean
  isEuResident: boolean
  billingHistoryId: string | null
  purchasePaidAt: string | null
  amount: number | null
}

/** Result of committing a refund: the evaluation plus the persisted audit ids. */
export interface RefundProcessResult extends RefundEvaluation {
  refundRequestId: string
  stripeRefundId: string | null
}

export interface AdminRefundRow {
  id: string
  user_id: string
  email: string
  name: string | null
  decision: RefundDecision
  reason_code: string
  reason_detail: string | null
  days_since_purchase: number | null
  lessons_opened: number
  lessons_completed: number
  is_renewal_charge: boolean
  courtesy_applied: boolean
  stripe_refund_id: string | null
  processed_by_email: string | null
  amount: number | null
  description: string | null
  paid_at: string | null
  created_at: string
}

export interface AdminRefundListResponse {
  items: AdminRefundRow[]
  total: number
  page: number
  limit: number
}

/**
 * Lists past refund decisions (approved and denied) for the Refunds queue.
 */
export async function fetchAdminRefunds(params: {
  search?: string
  decision?: RefundDecision
  page?: number
  limit?: number
}): Promise<AdminRefundListResponse> {
  const sp = new URLSearchParams()
  if (params.search?.trim()) sp.set('search', params.search.trim())
  if (params.decision) sp.set('decision', params.decision)
  if (params.page != null) sp.set('page', String(params.page))
  if (params.limit != null) sp.set('limit', String(params.limit))
  const q = sp.toString()
  return httpClient.get<AdminRefundListResponse>(`/admin/refunds${q ? `?${q}` : ''}`)
}

/**
 * Runs the refund policy engine for a user without moving money or writing an
 * audit row. Safe to call repeatedly — this is the "check first" half of the flow.
 */
export async function evaluateRefund(
  userId: string,
  billingHistoryId?: string
): Promise<RefundEvaluation> {
  return httpClient.post<RefundEvaluation>(`/admin/users/${userId}/refund/evaluate`, {
    ...(billingHistoryId ? { billingHistoryId } : {}),
  })
}

/**
 * Commits a refund decision. With `executeStripeRefund: true` this issues a real
 * Stripe refund; with `false` it records the decision without moving money.
 * Idempotent per billing row on the server side.
 */
export async function processRefund(args: {
  userId: string
  billingHistoryId?: string
  executeStripeRefund: boolean
}): Promise<RefundProcessResult> {
  return httpClient.post<RefundProcessResult>(`/admin/users/${args.userId}/refund/process`, {
    ...(args.billingHistoryId ? { billingHistoryId: args.billingHistoryId } : {}),
    executeStripeRefund: args.executeStripeRefund,
  })
}
