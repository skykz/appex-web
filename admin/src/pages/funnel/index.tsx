import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingDown, Users, Mail, CheckCircle2, Clock } from 'lucide-react'
import { funnelApi, type FunnelFilters, type FunnelStep } from '@features/funnel/api'
import { Card, CardContent } from '@shared/ui/card'
import { PageHeader } from '@shared/ui/page-header'
import { QueryErrorPanel } from '@shared/ui/query-error-panel'
import { Select } from '@shared/ui/select'
import { Skeleton } from '@shared/ui/skeleton'

const FUNNEL_KEY = ['admin', 'funnel'] as const

const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
] as const

/** ISO timestamp N days back, used as the report's lower bound. */
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
}

/**
 * A step counts as a problem when it loses an unusually large share of the
 * people who reach it. Flat percentage thresholds would light up the whole
 * funnel (every step loses someone), so this compares against the funnel's own
 * median drop instead — what stands out is what needs attention.
 */
function severityOf(step: FunnelStep, medianDrop: number): 'high' | 'medium' | null {
  if (step.reached < 5) return null // too little data to call
  if (step.drop_rate >= Math.max(25, medianDrop * 2.5)) return 'high'
  if (step.drop_rate >= Math.max(12, medianDrop * 1.5)) return 'medium'
  return null
}

const SECTION_COLOR: Record<string, string> = {
  intro: 'bg-slate-400',
  profile: 'bg-sky-400',
  pain: 'bg-amber-400',
  goals: 'bg-violet-400',
  value: 'bg-teal-400',
  plan: 'bg-indigo-400',
  signup: 'bg-emerald-500',
  paywall: 'bg-orange-500',
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <span className="mt-0.5 rounded-lg bg-muted p-2">
          <Icon className="size-4 text-muted-foreground" />
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

export function FunnelPage() {
  const [days, setDays] = useState('30')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filters = useMemo<FunnelFilters>(() => ({ from: daysAgo(Number(days)) }), [days])

  const report = useQuery({
    queryKey: [...FUNNEL_KEY, days],
    queryFn: () => funnelApi.getReport(filters),
  })

  const breakdown = useQuery({
    queryKey: [...FUNNEL_KEY, 'step', expanded, days],
    queryFn: () => funnelApi.getStepBreakdown(expanded as string, filters),
    enabled: Boolean(expanded),
  })

  const steps = report.data?.steps ?? []
  const totals = report.data?.totals

  // Baseline for "unusual" drop — see severityOf.
  const medianDrop = useMemo(() => {
    const rates = steps.filter((s) => s.reached >= 5).map((s) => s.drop_rate).sort((a, b) => a - b)
    if (!rates.length) return 0
    const mid = Math.floor(rates.length / 2)
    return rates.length % 2 ? rates[mid] : (rates[mid - 1] + rates[mid]) / 2
  }, [steps])

  const worst = useMemo(() => {
    const flagged = steps
      .filter((s) => s.reached >= 5)
      .sort((a, b) => b.dropped - a.dropped)
      .slice(0, 3)
    return flagged
  }, [steps])

  const maxReached = steps[0]?.reached ?? 1

  return (
    <div className="space-y-6">
      <PageHeader
        title="Funnel"
        description="Where visitors drop out of the quiz and paywall, step by step."
        actions={
          <Select value={days} onChange={(e) => setDays(e.target.value)}>
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        }
      />

      {report.isError && <QueryErrorPanel error={report.error} onRetry={report.refetch} />}

      {report.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (
        totals && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Users} label="Sessions" value={totals.sessions} hint={`${totals.devices} devices`} />
            <StatCard
              icon={Mail}
              label="Reached email"
              value={totals.reached_email}
              hint={totals.sessions ? `${Math.round((totals.reached_email / totals.sessions) * 100)}% of sessions` : undefined}
            />
            <StatCard
              icon={CheckCircle2}
              label="Completed quiz"
              value={totals.completed}
              hint={totals.sessions ? `${Math.round((totals.completed / totals.sessions) * 100)}% of sessions` : undefined}
            />
            <StatCard
              icon={TrendingDown}
              label="Biggest drop"
              value={worst[0]?.step_id ?? '—'}
              hint={worst[0] ? `${worst[0].dropped} left here` : undefined}
            />
          </div>
        )
      )}

      {/* Worst offenders, called out so the answer is visible without reading
          the whole table. */}
      {worst.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold">Where you lose the most people</h3>
            <div className="space-y-2">
              {worst.map((s, i) => (
                <div key={s.step_id} className="flex items-center gap-3 text-sm">
                  <span className="w-5 text-muted-foreground tabular-nums">{i + 1}.</span>
                  <span className="font-medium">{s.step_id}</span>
                  <span className="text-muted-foreground">
                    {s.question_text ? `— ${s.question_text}` : ''}
                  </span>
                  <span className="ml-auto shrink-0 font-semibold text-red-600 tabular-nums">
                    −{s.dropped} ({s.drop_rate}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* The funnel itself. Bar width is share of the first step, so the shape
          of the decline is readable at a glance. */}
      <Card>
        <CardContent className="p-0">
          {report.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-9" />
              ))}
            </div>
          ) : steps.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No events in this range yet. Data appears once visitors go through the quiz.
            </p>
          ) : (
            <div className="divide-y">
              {steps.map((s) => {
                const sev = severityOf(s, medianDrop)
                const width = Math.max(2, (s.reached / maxReached) * 100)
                const isOpen = expanded === s.step_id
                return (
                  <div key={s.step_id}>
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : s.step_id)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50"
                    >
                      <span className="w-7 shrink-0 text-xs text-muted-foreground tabular-nums">
                        {s.step_order}
                      </span>

                      <span className="w-44 shrink-0 truncate text-sm font-medium">{s.step_id}</span>

                      {/* Bar */}
                      <span className="relative h-6 flex-1 overflow-hidden rounded bg-muted">
                        <span
                          className={`absolute inset-y-0 left-0 ${SECTION_COLOR[s.section ?? ''] ?? 'bg-slate-400'}`}
                          style={{ width: `${width}%` }}
                        />
                        <span className="absolute inset-y-0 left-2 flex items-center text-xs font-medium text-foreground/80">
                          {s.reached}
                        </span>
                      </span>

                      <span className="w-14 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                        {s.conversion_from_start}%
                      </span>

                      <span
                        className={`w-20 shrink-0 text-right text-xs font-semibold tabular-nums ${
                          sev === 'high'
                            ? 'text-red-600'
                            : sev === 'medium'
                              ? 'text-amber-600'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {s.dropped > 0 ? `−${s.dropped}` : '—'}
                      </span>

                      <span className="hidden w-16 shrink-0 items-center justify-end gap-1 text-xs text-muted-foreground tabular-nums sm:flex">
                        <Clock className="size-3" />
                        {s.median_seconds != null ? `${s.median_seconds}s` : '—'}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="border-t bg-muted/30 px-4 py-3">
                        {s.question_text && (
                          <p className="mb-2 text-sm font-medium">{s.question_text}</p>
                        )}
                        {breakdown.isLoading ? (
                          <Skeleton className="h-20" />
                        ) : breakdown.data?.options.length ? (
                          <div className="space-y-1.5">
                            {breakdown.data.options.map((o) => (
                              <div key={o.answer} className="flex items-center gap-3 text-sm">
                                <span className="w-56 shrink-0 truncate">{o.answer}</span>
                                <span className="relative h-4 flex-1 overflow-hidden rounded bg-background">
                                  <span
                                    className="absolute inset-y-0 left-0 bg-violet-400"
                                    style={{ width: `${o.share}%` }}
                                  />
                                </span>
                                <span className="w-20 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                                  {o.count} ({o.share}%)
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No answers recorded — this screen has no question.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
