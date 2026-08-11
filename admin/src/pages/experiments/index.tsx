import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, DollarSign, Trophy } from 'lucide-react'
import {
  pricingExperimentApi,
  STAGE_LABELS,
  VARIANT_LABELS,
  type ArmReport,
  type PricingExperimentFilters,
} from '@features/pricing-experiment/api'
import { resolveRange, toDateInput, type CustomRange, type RangeKey } from '@shared/lib'
import { DateRangePicker } from '@shared/ui/date-range-picker'
import { Card, CardContent } from '@shared/ui/card'
import { PageHeader } from '@shared/ui/page-header'
import { QueryErrorPanel } from '@shared/ui/query-error-panel'
import { Select } from '@shared/ui/select'
import { Skeleton } from '@shared/ui/skeleton'

const KEY = ['admin', 'pricing-experiment'] as const

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

/**
 * Below this many purchases per arm, a difference between arms is noise.
 *
 * Not a significance test — a real one needs a variance model this data doesn't
 * carry. It exists to stop the page presenting a 2-vs-3 sale split as a result,
 * which is the failure mode of every hand-built A/B readout.
 */
const MIN_PURCHASES_TO_CALL = 25

function armLabel(variant: string): string {
  return VARIANT_LABELS[variant] ?? variant
}

/** Stat tile, matching the funnel page's StatCard rather than inventing a second look. */
function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  hint?: string
  tone?: 'default' | 'warning'
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <span
          className={`mt-0.5 rounded-lg p-2 ${
            tone === 'warning' ? 'bg-amber-100' : 'bg-muted'
          }`}
        >
          <Icon
            className={`size-4 ${
              tone === 'warning' ? 'text-amber-700' : 'text-muted-foreground'
            }`}
          />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold tabular-nums">{value}</p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * One arm's full readout.
 *
 * Ordered revenue-per-visitor → funnel → plan mix on purpose. A cheaper entry
 * price reliably lifts conversion and lowers order value, so a card that led
 * with conversion would show the $0.99 arm winning almost regardless of whether
 * it made more money.
 */
function ArmCard({
  arm,
  baseline,
  isWinner,
}: {
  arm: ArmReport
  /** Control, for the lift comparison; undefined when this IS control. */
  baseline?: ArmReport
  isWinner: boolean
}) {
  const paywall = arm.stages.find((s) => s.stage === 'paywall_view')?.sessions ?? 0
  const purchases = arm.stages.find((s) => s.stage === 'purchase')?.sessions ?? 0

  const lift =
    baseline && baseline.revenue_per_visitor > 0
      ? ((arm.revenue_per_visitor - baseline.revenue_per_visitor) /
          baseline.revenue_per_visitor) *
        100
      : null

  const maxStage = arm.stages[0]?.sessions || 1

  return (
    <Card className={isWinner ? 'ring-2 ring-emerald-500' : undefined}>
      <CardContent className="space-y-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold">{armLabel(arm.variant)}</h3>
              {isWinner && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                  <Trophy className="size-3" /> Leading
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{paywall} paywall visitors</p>
          </div>
        </div>

        {/* THE decision metric, given the most visual weight on the card. */}
        <div className="rounded-lg bg-muted/60 p-4">
          <p className="text-xs font-medium text-muted-foreground">Revenue per visitor</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold tabular-nums">{usd(arm.revenue_per_visitor)}</p>
            {lift !== null && (
              <span
                className={`text-sm font-semibold tabular-nums ${
                  lift >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {lift >= 0 ? '+' : ''}
                {Math.round(lift * 10) / 10}%
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {usd(arm.revenue)} from {arm.paying_users} matched{' '}
            {arm.paying_users === 1 ? 'payment' : 'payments'}
          </p>
        </div>

        {/* Funnel: hand-rolled bars, matching the funnel page — no chart lib here. */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Funnel</p>
          {arm.stages.map((s) => (
            <div key={s.stage} className="space-y-1">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-foreground">{STAGE_LABELS[s.stage]}</span>
                <span className="tabular-nums text-muted-foreground">
                  {s.sessions} · {s.conversion_from_paywall}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-sky-500"
                  style={{ width: `${Math.min(100, (s.sessions / maxStage) * 100)}%` }}
                />
              </div>
            </div>
          ))}
          <p className="pt-1 text-xs text-muted-foreground">
            Purchase rate <span className="font-semibold tabular-nums">{arm.purchase_rate}%</span>
          </p>
        </div>

        {/* Plan mix — the mechanism behind a revenue difference. An arm can win
            on volume while selling only the cheapest plan. */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Plan mix (purchases)</p>
          {arm.plan_mix.length === 0 ? (
            <p className="text-xs text-muted-foreground">No purchases yet.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-1 font-medium">Plan</th>
                  <th className="pb-1 text-right font-medium">Checkouts</th>
                  <th className="pb-1 text-right font-medium">Bought</th>
                  <th className="pb-1 text-right font-medium">Share</th>
                </tr>
              </thead>
              <tbody>
                {arm.plan_mix.map((p) => (
                  <tr key={p.plan} className="border-t border-border/60">
                    <td className="py-1.5 pr-2">{p.plan}</td>
                    <td className="py-1.5 text-right tabular-nums">{p.checkouts}</td>
                    <td className="py-1.5 text-right tabular-nums">{p.purchases}</td>
                    <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                      {p.share}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Match rate belongs on the card, not in a footnote: revenue compared
            across arms with very different match rates isn't a comparison. */}
        {purchases > 0 && arm.matched_share < 80 && (
          <p className="flex items-start gap-1.5 rounded-md bg-amber-50 p-2 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 size-3 shrink-0" />
            Only {arm.matched_share}% of purchases matched a payment record — revenue here is a
            floor, not a total.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function ExperimentsPage() {
  const [range, setRange] = useState<RangeKey>('30')
  /** Seeded to the last 7 days so "Custom range…" opens on a usable window. */
  const [custom, setCustom] = useState<CustomRange>(() => {
    const today = new Date()
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 6)
    return { from: toDateInput(weekAgo), to: toDateInput(today) }
  })

  const filters = useMemo<PricingExperimentFilters>(
    () => resolveRange(range, custom),
    [range, custom]
  )

  // Keyed on the resolved window, not the preset: two different custom picks
  // both read as 'custom' and would otherwise share one cache entry.
  const rangeKey = `${filters.from ?? ''}|${filters.to ?? ''}`

  const report = useQuery({
    queryKey: [...KEY, rangeKey],
    queryFn: () => pricingExperimentApi.getReport(filters),
  })

  const arms = report.data?.arms ?? []
  const control = arms.find((a) => a.variant === 'control')

  const totals = useMemo(() => {
    const visitors = arms.reduce(
      (n, a) => n + (a.stages.find((s) => s.stage === 'paywall_view')?.sessions ?? 0),
      0
    )
    const purchases = arms.reduce(
      (n, a) => n + (a.stages.find((s) => s.stage === 'purchase')?.sessions ?? 0),
      0
    )
    const revenue = arms.reduce((n, a) => n + a.revenue, 0)
    return { visitors, purchases, revenue }
  }, [arms])

  // "Leading" is only shown once both arms have enough sales to mean anything —
  // otherwise the badge would just point at whichever arm got lucky first.
  const winner = useMemo(() => {
    const eligible = arms.filter(
      (a) =>
        (a.stages.find((s) => s.stage === 'purchase')?.sessions ?? 0) >= MIN_PURCHASES_TO_CALL
    )
    if (eligible.length < 2) return null
    return [...eligible].sort((a, b) => b.revenue_per_visitor - a.revenue_per_visitor)[0]
  }, [arms])

  const thin = arms.length > 0 && !winner

  return (
    <div className="space-y-6">
      <PageHeader
        title="Experiments"
        description="Paywall pricing A/B. Judged on revenue per visitor — a cheaper entry price lifts conversion and lowers order value, so conversion alone always favours the cheap arm."
        actions={
          <DateRangePicker
            range={range}
            onRangeChange={setRange}
            custom={custom}
            onCustomChange={setCustom}
          />
        }
      />

      {report.isError && <QueryErrorPanel error={report.error} onRetry={report.refetch} />}

      {report.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      ) : arms.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No pricing-experiment events in this range. Events only carry an arm from the paywall
            onward, and only since the test shipped.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={DollarSign} label="Revenue (matched)" value={usd(totals.revenue)} />
            <StatCard icon={Trophy} label="Paywall visitors" value={totals.visitors} />
            <StatCard
              icon={Trophy}
              label="Purchases"
              value={totals.purchases}
              hint={totals.visitors ? `${Math.round((totals.purchases / totals.visitors) * 1000) / 10}% overall` : undefined}
            />
            <StatCard
              icon={AlertTriangle}
              label="Unmatched purchases"
              value={report.data?.unmatched_purchases ?? 0}
              tone={(report.data?.unmatched_purchases ?? 0) > 0 ? 'warning' : 'default'}
              hint="No payment record found"
            />
          </div>

          {thin && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              Not enough purchases to call a winner yet — at least {MIN_PURCHASES_TO_CALL} per arm.
              The numbers below are real, but a gap between arms at this volume is likely noise.
            </p>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {arms.map((arm) => (
              <ArmCard
                key={arm.variant}
                arm={arm}
                baseline={arm.variant === 'control' ? undefined : control}
                isWinner={winner?.variant === arm.variant}
              />
            ))}
          </div>

          {/* Stated on the page rather than left for whoever reads it to
              discover: the revenue join is lossy by construction. */}
          <p className="text-xs leading-relaxed text-muted-foreground">
            Revenue comes from <code>billing_history</code> — money actually charged — joined to the
            arm by the email captured in the quiz. Buyers who paid under a different address, or who
            never reached the email step, count as unmatched. The client-side purchase value is
            deliberately not used: it records the renewal price, which is the one number this test
            does not change.
          </p>
        </>
      )}
    </div>
  )
}
