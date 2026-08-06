import { httpClient } from '@shared/api/http-client'

/** Paywall stages the experiment is measured on, in funnel order. */
export type PricingStage = 'paywall_view' | 'checkout_modal_view' | 'purchase'

export interface StageCount {
  stage: PricingStage
  sessions: number
  conversion_from_paywall: number
}

export interface PlanMixEntry {
  plan: string
  checkouts: number
  purchases: number
  /** Share of this arm's purchases, as a percentage. */
  share: number
}

export interface ArmReport {
  variant: string
  stages: StageCount[]
  purchase_rate: number
  plan_mix: PlanMixEntry[]
  /** Real money from `billing_history`, not the client-side purchase value. */
  revenue: number
  paying_users: number
  /** revenue / paywall visitors — the metric the test is decided on. */
  revenue_per_visitor: number
  /** Share of purchase events matched to a payment; low = revenue unreliable. */
  matched_share: number
}

export interface PricingExperimentReport {
  arms: ArmReport[]
  range: { from: string; to: string }
  unmatched_purchases: number
}

export interface PricingExperimentFilters {
  from?: string
  to?: string
  landing?: string
}

function toQuery(f: PricingExperimentFilters): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, v)
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const pricingExperimentApi = {
  getReport: (filters: PricingExperimentFilters = {}) =>
    httpClient.get<PricingExperimentReport>(`/admin/pricing-experiment${toQuery(filters)}`),
}

/** Human labels for the arms; falls back to the raw slug for unknown ones. */
export const VARIANT_LABELS: Record<string, string> = {
  control: 'Control',
  day_entry: 'Day entry ($0.99)',
}

/** Stage labels, kept out of the page so both live next to the types. */
export const STAGE_LABELS: Record<PricingStage, string> = {
  paywall_view: 'Saw paywall',
  checkout_modal_view: 'Opened checkout',
  purchase: 'Purchased',
}
