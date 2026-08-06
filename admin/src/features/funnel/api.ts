import { httpClient } from '@shared/api/http-client'

export interface FunnelStep {
  step_order: number
  step_id: string
  section: string | null
  question_text: string | null
  /** Distinct sessions that saw this screen. */
  reached: number
  /** Sessions that submitted an answer here. */
  answered: number
  /** Median seconds on the screen — median, not mean, so one idle tab can't skew it. */
  median_seconds: number | null
  /** Sessions whose furthest point was this screen. */
  dropped: number
  drop_rate: number
  conversion_from_start: number
  /** question | info | loader | milestone | funnel. */
  step_type: string | null
  /** Saw the screen but never answered it — 0 for screens taking no answer. */
  viewed_not_answered: number
}

export interface SectionRollup {
  section: string
  entered: number
  exited: number
  drop_rate: number
}

export interface DeviceSplit {
  device: string
  sessions: number
  reached_email: number
  completed: number
  completion_rate: number
}

export interface FunnelReport {
  steps: FunnelStep[]
  totals: {
    sessions: number
    reached_email: number
    completed: number
    devices: number
    /** Sessions that left without answering anything. */
    bounced_immediately: number
  }
  sections: SectionRollup[]
  by_device: DeviceSplit[]
  range: { from: string; to: string }
}

export interface StepBreakdown {
  step_id: string
  question_text: string | null
  options: { answer: string; count: number; share: number }[]
}

export interface FunnelFilters {
  from?: string
  to?: string
  landing?: string
  utm_source?: string
  quiz_version?: string
  /**
   * Scopes the funnel to one paywall pricing arm.
   *
   * Left unset the report merges every arm into one funnel — plausible-looking
   * and wrong, since the arms are shown different prices.
   */
  pricing_variant?: string
}

function toQuery(f: FunnelFilters): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, v)
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const funnelApi = {
  getReport: (filters: FunnelFilters = {}) =>
    httpClient.get<FunnelReport>(`/admin/funnel${toQuery(filters)}`),

  getStepBreakdown: (stepId: string, filters: FunnelFilters = {}) =>
    httpClient.get<StepBreakdown>(
      `/admin/funnel/step/${encodeURIComponent(stepId)}${toQuery(filters)}`
    ),
}
