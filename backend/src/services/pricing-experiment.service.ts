import { supabaseAdmin } from '../db/supabase.js'
import { quizLog } from '../lib/logger.js'
import { isTestRow, fetchAllRows } from './funnel-analytics.service.js'

/**
 * Reads the paywall pricing A/B test (`quiz_events.pricing_variant`).
 *
 * Separate from funnel-analytics because it answers a different question. The
 * funnel asks "where do people stop"; this asks "which entry price makes more
 * money", and those need different numbers — an arm can win the funnel and lose
 * the test.
 *
 * WHY NOT THE `pricing_variant_funnel` VIEW (migration 045)
 * It has no date range, so it accumulates across every experiment ever run and
 * can't be scoped to one test window. It also has no test-traffic filtering.
 * Same query-builder-and-aggregate-in-Node approach as funnel-analytics instead.
 */

/** Paywall stages, in the order a visitor passes through them. */
const STAGES = ['paywall_view', 'checkout_modal_view', 'purchase'] as const
type Stage = (typeof STAGES)[number]

/**
 * `plan_select` is deliberately NOT a stage.
 *
 * The client only emits it when a visitor CHANGES plan, so everyone who accepts
 * the default emits none. Putting it mid-funnel would show a collapse between
 * paywall and checkout that is an artifact of the instrumentation, not
 * behaviour. Plan mix is read off `checkout_modal_view` / `purchase` instead,
 * which fire for every visitor regardless of whether they switched.
 */

export interface PlanMixEntry {
  plan: string
  /** Sessions that opened checkout on this plan. */
  checkouts: number
  /** Sessions that bought on this plan. */
  purchases: number
  /** purchases / (arm's total purchases), as a percentage. */
  share: number
}

export interface ArmReport {
  variant: string
  /** Distinct sessions at each paywall stage. */
  stages: { stage: Stage; sessions: number; conversion_from_paywall: number }[]
  /** paywall_view → purchase, as a percentage. */
  purchase_rate: number
  plan_mix: PlanMixEntry[]
  /**
   * Money actually charged, from `billing_history` — NOT the client-side
   * `purchase.value`, which is the RENEWAL price read out of localStorage. For
   * an entry-price test the intro charge is precisely what differs between
   * arms, so the client number measures the one thing the test isn't changing.
   */
  revenue: number
  /** Buyers we could match to a real payment; see `matched_share`. */
  paying_users: number
  /**
   * revenue / paywall_view sessions — THE DECISION METRIC.
   *
   * A cheaper entry price nearly always lifts conversion and lowers order
   * value, so conversion alone will declare the cheap arm the winner every
   * time. This is the number that says whether it actually made more money.
   */
  revenue_per_visitor: number
  /**
   * Share of this arm's purchase events matched to a billing row, as a
   * percentage.
   *
   * Surfaced because the join is lossy by construction (see `joinRevenue`), and
   * revenue compared across arms with very different match rates is not a
   * comparison. Low here means "unreliable", not "less revenue".
   */
  matched_share: number
}

export interface PricingExperimentReport {
  arms: ArmReport[]
  range: { from: string; to: string }
  /**
   * Purchase events across all arms that no billing row could be matched to.
   * A high number invalidates the revenue comparison — hence reported, not
   * silently dropped.
   */
  unmatched_purchases: number
}

interface EventRow {
  session_id: string | null
  anon_id: string
  email: string | null
  step_id: string | null
  event_name: string
  pricing_variant: string | null
  answer_label: string | null
  created_at: string
}

/** Empty arm, so a variant with traffic but no sales still renders as a column. */
function emptyArm(variant: string): ArmReport {
  return {
    variant,
    stages: STAGES.map((stage) => ({ stage, sessions: 0, conversion_from_paywall: 0 })),
    purchase_rate: 0,
    plan_mix: [],
    revenue: 0,
    paying_users: 0,
    revenue_per_visitor: 0,
    matched_share: 0,
  }
}

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0)
const money = (n: number) => Math.round(n * 100) / 100

/**
 * Resolves the money each arm actually took, keyed by the emails that bought.
 *
 * The join is still lossy: buyers without an email on the client event cannot
 * be matched. But the A/B arm comes from `billing_history.pricing_variant`,
 * copied from Stripe's immutable invoice metadata snapshot, rather than being
 * inferred from an email. That prevents renewals or another checkout by the
 * same customer from being credited to the arm being viewed today.
 *
 *   quiz_events.email → users.email → users.id → billing_history.user_id
 *
 * The report intentionally includes only `subscription_create` invoices. A/B
 * entry pricing is decided on the initial charge; renewal timing differs by
 * plan and would bias a fixed date-range comparison toward older cohorts.
 */
async function joinRevenue(
  emailsByVariant: Map<string, string[]>,
  from: string,
  to: string
): Promise<Map<string, number>> {
  const byVariantEmail = new Map<string, number>()
  const emails = [...new Set([...emailsByVariant.values()].flat())]
  if (!emails.length) return byVariantEmail

  // Chunked: `in` lists go into the URL, and a wide range can carry more emails
  // than a query string will hold.
  const CHUNK = 300
  const userIdToEmail = new Map<string, string>()

  for (let i = 0; i < emails.length; i += CHUNK) {
    const slice = emails.slice(i, i + CHUNK)
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .in('email', slice)

    if (error) {
      quizLog.error('pricing_experiment.users_lookup_failed', { message: error.message })
      continue
    }
    for (const u of data ?? []) {
      if (u.email) userIdToEmail.set(u.id as string, (u.email as string).toLowerCase())
    }
  }

  for (const [variant, variantEmails] of emailsByVariant) {
    const variantEmailSet = new Set(variantEmails)
    const userIds = [...userIdToEmail.entries()]
      .filter(([, email]) => variantEmailSet.has(email))
      .map(([userId]) => userId)

    for (let i = 0; i < userIds.length; i += CHUNK) {
      const slice = userIds.slice(i, i + CHUNK)
      const { data, error } = await supabaseAdmin
        .from('billing_history')
        .select('user_id, amount, paid_at, status')
        .in('user_id', slice)
        .eq('pricing_variant', variant)
        .eq('billing_reason', 'subscription_create')
        .gte('paid_at', from)
        .lte('paid_at', to)
        .limit(100_000)

      if (error) {
        quizLog.error('pricing_experiment.billing_lookup_failed', { message: error.message })
        continue
      }
      for (const b of data ?? []) {
        // Only money that actually settled. Draft/open/uncollectible invoices are
        // an intention to pay, and counting them would credit an arm for revenue
        // it never received.
        if (b.status && b.status !== 'paid') continue
        const email = userIdToEmail.get(b.user_id as string)
        if (!email) continue
        // `amount` is stored in DOLLARS (stripe.service divides by 100 on write).
        const key = `${variant}:${email}`
        byVariantEmail.set(key, (byVariantEmail.get(key) ?? 0) + Number(b.amount ?? 0))
      }
    }
  }

  return byVariantEmail
}

/**
 * Builds the per-arm pricing report for a date range.
 *
 * Revenue is scoped to the SAME window as the events. A payment that lands
 * after `to` is excluded even if its paywall view falls inside — the alternative
 * (an open-ended revenue tail) would make the report change every time it was
 * refreshed, and would flatter whichever arm ran earliest.
 */
export async function getPricingExperiment(
  opts: { from?: string; to?: string; landing?: string } = {}
): Promise<PricingExperimentReport> {
  // Upper bound sits slightly ahead of now for the same reason as the funnel
  // report: clock skew against Postgres would otherwise drop the newest events.
  const to = opts.to ?? new Date(Date.now() + 5 * 60_000).toISOString()
  const from =
    opts.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Paged for the same reason as the funnel report: one request is capped by
  // the server at ~1000 rows whatever `.limit()` says, and a partial arm count
  // would look like a real result. See fetchAllRows.
  const { rows: fetched, truncated } = await fetchAllRows<EventRow>((start, end) => {
    let query = supabaseAdmin
      .from('quiz_events')
      .select('session_id, anon_id, email, step_id, event_name, pricing_variant, answer_label, created_at')
      .not('pricing_variant', 'is', null)
      .in('step_id', STAGES as unknown as string[])
      .gte('created_at', from)
      .lte('created_at', to)
      // Stable order so pages can't overlap or skip rows.
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(start, end)

    if (opts.landing) query = query.eq('landing', opts.landing)
    return query
  }, 'pricing_experiment')

  if (truncated) {
    quizLog.error('pricing_experiment.partial_result', { from, to, rows: fetched.length })
    if (fetched.length === 0) return { arms: [], range: { from, to }, unmatched_purchases: 0 }
  }

  const data = fetched

  // Test traffic is dropped inside aggregateArms, not here, so the two can't
  // disagree — the revenue join below must see the same rows the report does.
  const rows = (data ?? []) as EventRow[]

  const buyerEmails = collectBuyerEmails(rows)
  const revenueByEmail = await joinRevenue(buyerEmails, from, to)

  return { ...aggregateArms(rows, revenueByEmail), range: { from, to } }
}

/**
 * Lowercased emails on `purchase` rows — the input to the revenue join.
 *
 * Applies the same test-traffic filter as the aggregation so we never look up
 * billing rows for our own synthetic sessions.
 */
function collectBuyerEmails(rows: EventRow[]): Map<string, string[]> {
  const out = new Map<string, Set<string>>()
  for (const r of rows) {
    if (isTestRow(r)) continue
    if (r.step_id === 'purchase' && r.email && r.pricing_variant) {
      const emails = out.get(r.pricing_variant) ?? new Set<string>()
      emails.add(r.email.toLowerCase())
      out.set(r.pricing_variant, emails)
    }
  }
  return new Map([...out].map(([variant, emails]) => [variant, [...emails]]))
}

/**
 * Turns raw event rows into the per-arm report.
 *
 * Split out from the query so the aggregation can be tested directly — it holds
 * every rule the report depends on (which stage a plan is read from, how a
 * buyer maps to money, what counts as unmatched), and those are exactly the
 * things that fail silently when wrong.
 */
export function aggregateArms(
  rows: EventRow[],
  revenueByEmail: Map<string, number>
): Omit<PricingExperimentReport, 'range'> {
  interface Bucket {
    stages: Map<Stage, Set<string>>
    /** plan → sessions, split by the stage the plan was observed on. */
    checkoutPlans: Map<string, Set<string>>
    purchasePlans: Map<string, Set<string>>
    /** Lowercased emails of sessions that reached `purchase`. */
    buyerEmails: Set<string>
    /** Distinct sessions that reached `purchase`, email or not. */
    purchaseSessions: Set<string>
    /** Purchase sessions carrying no email — unmatchable by construction. */
    sessionsWithoutEmail: Set<string>
    /** session → email, so a session isn't double-counted as email-less. */
    emailBySession: Map<string, string>
  }
  const arms = new Map<string, Bucket>()

  const keyOf = (r: EventRow) => r.session_id || r.anon_id

  for (const r of rows) {
    // Our own test traffic, dropped before any counting. A handful of synthetic
    // sessions is a large share of an experiment this size, and here they would
    // not merely inflate a count — they'd land in one arm and move the winner.
    if (isTestRow(r)) continue
    const variant = r.pricing_variant
    if (!variant || !r.step_id) continue
    const stage = r.step_id as Stage
    if (!STAGES.includes(stage)) continue

    let arm = arms.get(variant)
    if (!arm) {
      arm = {
        stages: new Map(STAGES.map((s) => [s, new Set<string>()])),
        checkoutPlans: new Map(),
        purchasePlans: new Map(),
        buyerEmails: new Set(),
        purchaseSessions: new Set(),
        sessionsWithoutEmail: new Set(),
        emailBySession: new Map(),
      }
      arms.set(variant, arm)
    }

    const key = keyOf(r)
    arm.stages.get(stage)!.add(key)

    const plan = r.answer_label
    if (plan) {
      const target = stage === 'purchase' ? arm.purchasePlans : arm.checkoutPlans
      if (stage === 'purchase' || stage === 'checkout_modal_view') {
        let set = target.get(plan)
        if (!set) { set = new Set(); target.set(plan, set) }
        set.add(key)
      }
    }

    if (stage === 'purchase') {
      arm.purchaseSessions.add(key)
      if (r.email) {
        arm.buyerEmails.add(r.email.toLowerCase())
        // A session can emit purchase twice — once before the email is
        // backfilled, once after — so a session is only "without email" if NO
        // row for it ever carried one.
        arm.sessionsWithoutEmail.delete(key)
      } else if (!arm.emailBySession.has(key)) {
        arm.sessionsWithoutEmail.add(key)
      }
      if (r.email) arm.emailBySession.set(key, r.email.toLowerCase())
    }
  }

  // An email that appears in BOTH arms cannot be attributed to either: the same
  // person saw both prices, so crediting their payment to one arm invents a
  // difference between the arms out of a bookkeeping choice. Dropped from
  // revenue entirely and counted as unmatched, which is what it is.
  const emailArms = new Map<string, Set<string>>()
  for (const [variant, arm] of arms) {
    for (const email of arm.buyerEmails) {
      let set = emailArms.get(email)
      if (!set) { set = new Set(); emailArms.set(email, set) }
      set.add(variant)
    }
  }

  let unmatched = 0

  const report: ArmReport[] = [...arms.entries()]
    .map(([variant, arm]) => {
      const out = emptyArm(variant)
      const paywall = arm.stages.get('paywall_view')!.size

      out.stages = STAGES.map((stage) => {
        const sessions = arm.stages.get(stage)!.size
        return { stage, sessions, conversion_from_paywall: pct(sessions, paywall) }
      })

      const purchases = arm.stages.get('purchase')!.size
      out.purchase_rate = pct(purchases, paywall)

      // Plan mix keyed on the union of both stages, so a plan that gets
      // checkouts but zero sales still shows up — that gap is the interesting
      // part of an entry-price test.
      const planNames = new Set([...arm.checkoutPlans.keys(), ...arm.purchasePlans.keys()])
      out.plan_mix = [...planNames]
        .map((plan) => {
          const bought = arm.purchasePlans.get(plan)?.size ?? 0
          return {
            plan,
            checkouts: arm.checkoutPlans.get(plan)?.size ?? 0,
            purchases: bought,
            share: pct(bought, purchases),
          }
        })
        .sort((a, b) => b.purchases - a.purchases || b.checkouts - a.checkouts)

      let revenue = 0
      let matched = 0
      for (const email of arm.buyerEmails) {
        // Skip buyers seen in more than one arm — see emailArms above.
        if ((emailArms.get(email)?.size ?? 0) > 1) continue
        const amount = revenueByEmail.get(`${variant}:${email}`)
        if (amount === undefined) continue
        revenue += amount
        matched++
      }
      // Everything below is counted in BUYERS, not sessions. `matched` counts
      // emails, and one buyer can purchase across two sessions (the Stripe
      // round-trip can start a new one), so mixing the two units would report a
      // phantom unmatched purchase for every such buyer and drag matched_share
      // below 100% even when every payment was found.
      // Distinct buyers: everyone who bought with an email, plus the sessions
      // that bought without one. Buyers seen in both arms stay in this total —
      // they are real purchases, just unattributable, so they belong in
      // `unmatched` rather than being quietly dropped from the denominator.
      const buyers = arm.buyerEmails.size + arm.sessionsWithoutEmail.size
      unmatched += Math.max(0, buyers - matched)

      out.revenue = money(revenue)
      out.paying_users = matched
      out.revenue_per_visitor = paywall ? Math.round((revenue / paywall) * 100) / 100 : 0
      out.matched_share = pct(matched, buyers)

      return out
    })
    // `control` first where present, so the comparison always reads
    // baseline-then-challenger rather than flipping with alphabetical order.
    .sort((a, b) => {
      if (a.variant === 'control') return -1
      if (b.variant === 'control') return 1
      return a.variant.localeCompare(b.variant)
    })

  return { arms: report, unmatched_purchases: unmatched }
}
