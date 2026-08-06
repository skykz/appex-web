import { describe, it, expect } from 'vitest'
import { aggregateArms } from './pricing-experiment.service.js'

/**
 * Aggregation tests for the pricing A/B report.
 *
 * These matter more than most: every failure mode here is SILENT. A miscounted
 * arm still renders as a clean number on the page, and the whole point of the
 * page is that someone reads that number and changes the price on it.
 */

type Row = Parameters<typeof aggregateArms>[0][number]

/** Terse row builder — the tests are about combinations, not field noise. */
function row(p: Partial<Row> & { step_id: string; pricing_variant: string }): Row {
  return {
    session_id: p.session_id ?? 's1',
    anon_id: p.anon_id ?? 'a1',
    email: p.email ?? null,
    step_id: p.step_id,
    event_name: 'step_view',
    pricing_variant: p.pricing_variant,
    answer_label: p.answer_label ?? null,
    created_at: p.created_at ?? '2026-08-01T00:00:00Z',
  }
}

const armOf = (r: ReturnType<typeof aggregateArms>, v: string) =>
  r.arms.find((a) => a.variant === v)!
const stage = (a: ReturnType<typeof armOf>, s: string) =>
  a.stages.find((x) => x.stage === s)!.sessions

describe('aggregateArms', () => {
  it('counts DISTINCT sessions, not rows', () => {
    // The paywall re-fires paywall_view on remount; counting rows would score
    // one indecisive visitor as several.
    const r = aggregateArms(
      [
        row({ step_id: 'paywall_view', pricing_variant: 'control', session_id: 's1' }),
        row({ step_id: 'paywall_view', pricing_variant: 'control', session_id: 's1' }),
        row({ step_id: 'paywall_view', pricing_variant: 'control', session_id: 's2' }),
      ],
      new Map()
    )
    expect(stage(armOf(r, 'control'), 'paywall_view')).toBe(2)
  })

  it('falls back to anon_id when session_id is missing', () => {
    const r = aggregateArms(
      [
        row({ step_id: 'paywall_view', pricing_variant: 'control', session_id: null, anon_id: 'a1' }),
        row({ step_id: 'paywall_view', pricing_variant: 'control', session_id: null, anon_id: 'a1' }),
      ],
      new Map()
    )
    expect(stage(armOf(r, 'control'), 'paywall_view')).toBe(1)
  })

  it('keeps arms fully separate', () => {
    const r = aggregateArms(
      [
        row({ step_id: 'paywall_view', pricing_variant: 'control', session_id: 's1' }),
        row({ step_id: 'paywall_view', pricing_variant: 'day_entry', session_id: 's2' }),
        row({ step_id: 'purchase', pricing_variant: 'day_entry', session_id: 's2' }),
      ],
      new Map()
    )
    expect(stage(armOf(r, 'control'), 'purchase')).toBe(0)
    expect(stage(armOf(r, 'day_entry'), 'purchase')).toBe(1)
  })

  it('puts control first regardless of encounter order', () => {
    const r = aggregateArms(
      [
        row({ step_id: 'paywall_view', pricing_variant: 'day_entry', session_id: 's1' }),
        row({ step_id: 'paywall_view', pricing_variant: 'control', session_id: 's2' }),
      ],
      new Map()
    )
    expect(r.arms[0].variant).toBe('control')
  })

  it('excludes test traffic', () => {
    const r = aggregateArms(
      [
        row({ step_id: 'paywall_view', pricing_variant: 'control', session_id: 'test-1' }),
        row({ step_id: 'paywall_view', pricing_variant: 'control', session_id: 'demo-2' }),
        row({ step_id: 'paywall_view', pricing_variant: 'control', session_id: 's3', email: 'x@example.com' }),
        row({ step_id: 'paywall_view', pricing_variant: 'control', session_id: 's4' }),
      ],
      new Map()
    )
    // Only the one clean session survives.
    expect(stage(armOf(r, 'control'), 'paywall_view')).toBe(1)
  })

  it('reads plan mix from checkout and purchase, never plan_select', () => {
    const r = aggregateArms(
      [
        row({ step_id: 'paywall_view', pricing_variant: 'control', session_id: 's1' }),
        row({ step_id: 'checkout_modal_view', pricing_variant: 'control', session_id: 's1', answer_label: 'week_4' }),
        row({ step_id: 'purchase', pricing_variant: 'control', session_id: 's1', answer_label: 'week_4' }),
        // plan_select is not a tracked stage and must not appear anywhere.
        row({ step_id: 'plan_select', pricing_variant: 'control', session_id: 's1', answer_label: 'year' }),
      ],
      new Map()
    )
    const arm = armOf(r, 'control')
    expect(arm.plan_mix.map((p) => p.plan)).toEqual(['week_4'])
    expect(arm.plan_mix[0]).toMatchObject({ checkouts: 1, purchases: 1, share: 100 })
    expect(arm.stages.some((s) => s.stage === ('plan_select' as never))).toBe(false)
  })

  it('keeps a plan that got checkouts but zero sales', () => {
    // The gap between "opened checkout" and "bought" is the interesting part of
    // an entry-price test, so the plan must not vanish from the table.
    const r = aggregateArms(
      [
        row({ step_id: 'checkout_modal_view', pricing_variant: 'control', session_id: 's1', answer_label: 'year' }),
      ],
      new Map()
    )
    expect(armOf(r, 'control').plan_mix[0]).toMatchObject({ plan: 'year', checkouts: 1, purchases: 0 })
  })

  it('computes revenue per visitor from real payments', () => {
    const r = aggregateArms(
      [
        ...['s1', 's2', 's3', 's4'].map((s) =>
          row({ step_id: 'paywall_view', pricing_variant: 'control', session_id: s })
        ),
        row({ step_id: 'purchase', pricing_variant: 'control', session_id: 's1', email: 'A@x.com' }),
      ],
      new Map([['control:a@x.com', 20]])
    )
    const arm = armOf(r, 'control')
    expect(arm.revenue).toBe(20)
    expect(arm.paying_users).toBe(1)
    expect(arm.revenue_per_visitor).toBe(5) // 20 / 4 paywall visitors
    expect(arm.matched_share).toBe(100)
  })

  it('matches emails case-insensitively', () => {
    const r = aggregateArms(
      [row({ step_id: 'purchase', pricing_variant: 'control', session_id: 's1', email: 'MiXeD@X.CoM' })],
      new Map([['control:mixed@x.com', 9.99]])
    )
    expect(armOf(r, 'control').revenue).toBe(9.99)
  })

  it('does not credit an arm with a payment recorded for another arm', () => {
    const r = aggregateArms(
      [
        row({ step_id: 'purchase', pricing_variant: 'control', session_id: 's1', email: 'control@x.com' }),
        row({ step_id: 'purchase', pricing_variant: 'day_entry', session_id: 's2', email: 'entry@x.com' }),
      ],
      new Map([['day_entry:entry@x.com', 0.99]])
    )
    expect(armOf(r, 'control').revenue).toBe(0)
    expect(armOf(r, 'day_entry').revenue).toBe(0.99)
  })

  it('reports an unmatched purchase when no payment is found', () => {
    const r = aggregateArms(
      [row({ step_id: 'purchase', pricing_variant: 'control', session_id: 's1', email: 'ghost@x.com' })],
      new Map()
    )
    expect(armOf(r, 'control')).toMatchObject({ revenue: 0, paying_users: 0, matched_share: 0 })
    expect(r.unmatched_purchases).toBe(1)
  })

  it('counts an email-less purchase as unmatched', () => {
    const r = aggregateArms(
      [row({ step_id: 'purchase', pricing_variant: 'control', session_id: 's1', email: null })],
      new Map()
    )
    expect(r.unmatched_purchases).toBe(1)
    expect(armOf(r, 'control').matched_share).toBe(0)
  })

  // ── Regressions ──────────────────────────────────────────────────────────

  it('does not invent an unmatched purchase when one buyer spans two sessions', () => {
    // The Stripe round-trip can return in a new session, so the same buyer
    // emits `purchase` twice. Counting matched in emails but unmatched in
    // sessions reported a phantom miss and pushed matched_share to 50%.
    const r = aggregateArms(
      [
        row({ step_id: 'purchase', pricing_variant: 'control', session_id: 's1', email: 'dup@x.com' }),
        row({ step_id: 'purchase', pricing_variant: 'control', session_id: 's2', email: 'dup@x.com' }),
      ],
      new Map([['control:dup@x.com', 30]])
    )
    expect(r.unmatched_purchases).toBe(0)
    expect(armOf(r, 'control')).toMatchObject({ paying_users: 1, revenue: 30, matched_share: 100 })
  })

  it('counts a buyer once when only the later purchase row carries an email', () => {
    // quiz_events.email is backfilled, so the first purchase row can be
    // email-less and a later one populated — the same session, not two buyers.
    const r = aggregateArms(
      [
        row({ step_id: 'purchase', pricing_variant: 'control', session_id: 's1', email: null }),
        row({ step_id: 'purchase', pricing_variant: 'control', session_id: 's1', email: 'late@x.com' }),
      ],
      new Map([['control:late@x.com', 12]])
    )
    expect(r.unmatched_purchases).toBe(0)
    expect(armOf(r, 'control')).toMatchObject({ paying_users: 1, matched_share: 100 })
  })

  it('refuses to credit a buyer who appears in BOTH arms', () => {
    // They saw both prices, so attributing the payment to either arm would
    // manufacture a difference between the arms out of a bookkeeping choice.
    const r = aggregateArms(
      [
        row({ step_id: 'purchase', pricing_variant: 'control', session_id: 's1', email: 'both@x.com' }),
        row({ step_id: 'purchase', pricing_variant: 'day_entry', session_id: 's2', email: 'both@x.com' }),
      ],
      new Map([['control:both@x.com', 50], ['day_entry:both@x.com', 50]])
    )
    expect(armOf(r, 'control').revenue).toBe(0)
    expect(armOf(r, 'day_entry').revenue).toBe(0)
    // Real purchases, just unattributable — they must not silently disappear.
    expect(r.unmatched_purchases).toBe(2)
  })

  it('never divides by zero on an arm with no paywall views', () => {
    const r = aggregateArms(
      [row({ step_id: 'purchase', pricing_variant: 'control', session_id: 's1', email: 'a@x.com' })],
      new Map([['control:a@x.com', 10]])
    )
    const arm = armOf(r, 'control')
    expect(arm.revenue_per_visitor).toBe(0)
    expect(arm.purchase_rate).toBe(0)
    expect(Number.isFinite(arm.revenue_per_visitor)).toBe(true)
  })

  it('returns an empty report for no rows', () => {
    expect(aggregateArms([], new Map())).toEqual({ arms: [], unmatched_purchases: 0 })
  })
})
