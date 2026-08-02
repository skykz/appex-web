import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingDown, Users, Mail, CheckCircle2, Clock, LogOut, Smartphone, Monitor, Tablet, ArrowDown, SkipForward } from 'lucide-react'
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
  /**
   * Three readings of the same numbers, because each answers a different
   * question: `bars` for "how many at each screen", `shape` for "where does the
   * cliff sit", `heat` for "which screens are worst" at a glance.
   */
  const [view, setView] = useState<'bars' | 'shape' | 'heat'>('bars')
  /**
   * Questions and info screens leak for different reasons — bad wording versus
   * lost patience — so they can be looked at separately instead of being ranked
   * against each other in one list.
   */
  const [kind, setKind] = useState<'all' | 'question' | 'info'>('all')

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

  const allSteps = report.data?.steps ?? []
  const steps =
    kind === 'all'
      ? allSteps
      : allSteps.filter((s) =>
          kind === 'question'
            ? s.step_type === 'question'
            : s.step_type !== 'question'
        )
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
              icon={LogOut}
              label="Left without answering"
              value={totals.bounced_immediately}
              hint={
                totals.sessions
                  ? `${Math.round((totals.bounced_immediately / totals.sessions) * 100)}% never engaged`
                  : undefined
              }
            />
            <StatCard
              icon={TrendingDown}
              label="Biggest drop"
              value={worst[0]?.step_id ?? '—'}
              hint={worst[0] ? `${worst[0].dropped} left here (${worst[0].drop_rate}%)` : undefined}
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

      {/* Stage-level view. A section can bleed people across several screens that
          each look fine alone, so the rollup is where that becomes visible. */}
      {(report.data?.sections?.length ?? 0) > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-1 text-sm font-semibold">Drop-off by stage</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Share of everyone entering a stage who left somewhere inside it.
            </p>
            <div className="space-y-2">
              {report.data!.sections.map((sec) => (
                <div key={sec.section} className="flex items-center gap-3 text-sm">
                  <span className="w-20 shrink-0 capitalize">{sec.section}</span>
                  <span className="relative h-5 flex-1 overflow-hidden rounded bg-muted">
                    <span
                      className={`absolute inset-y-0 left-0 ${SECTION_COLOR[sec.section] ?? 'bg-slate-400'}`}
                      style={{ width: `${Math.min(100, sec.drop_rate)}%` }}
                    />
                    <span className="absolute inset-y-0 left-2 flex items-center text-xs font-medium">
                      {sec.drop_rate}% left
                    </span>
                  </span>
                  <span className="w-28 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                    {sec.exited} of {sec.entered}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Device split: the same funnel usually performs very differently on a
          phone, and that difference is invisible in the combined numbers. */}
      {(report.data?.by_device?.length ?? 0) > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold">By device</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {report.data!.by_device.map((d) => {
                const Icon =
                  d.device === 'mobile' ? Smartphone : d.device === 'tablet' ? Tablet : Monitor
                return (
                  <div key={d.device} className="rounded-lg border p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <Icon className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium capitalize">{d.device}</span>
                    </div>
                    <p className="text-lg font-bold tabular-nums">{d.sessions}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.reached_email} reached email · {d.completed} completed
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded bg-muted">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${Math.min(100, d.completion_rate)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {d.completion_rate}% completion
                    </p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* View switcher. The same data, three readings — see the `view` state. */}
      {steps.length > 0 && (
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1 w-fit">
          {([
            ['bars', 'Steps', 'Count reaching each screen'],
            ['shape', 'Funnel shape', 'Width shows how many survive'],
            ['heat', 'Drop heatmap', 'Colour by drop severity'],
          ] as const).map(([id, label, hint]) => (
            <button
              key={id}
              type="button"
              title={hint}
              onClick={() => setView(id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                view === id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {label}
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-border" />
          {([
            ['all', 'All'],
            ['question', 'Questions'],
            ['info', 'Info / other'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setKind(id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                kind === id
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
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
          ) : view === 'shape' ? (
            /* Centred funnel: each screen is a band whose width is the share of
               visitors still present. A cliff is visible as a sudden narrowing,
               which a flat list of numbers does not convey. */
            <div className="space-y-0.5 p-3">
              {steps.map((s) => {
                const width = Math.max(3, (s.reached / maxReached) * 100)
                const sev = severityOf(s, medianDrop)
                return (
                  <button
                    key={s.step_id}
                    type="button"
                    onClick={() => setExpanded(expanded === s.step_id ? null : s.step_id)}
                    className="group flex w-full items-center gap-2 rounded px-1 py-px hover:bg-muted/40"
                    title={`${s.step_id} — ${s.reached} reached, ${s.dropped} left`}
                  >
                    <span className="w-6 shrink-0 text-right text-[9px] text-muted-foreground tabular-nums">
                      {s.step_order}
                    </span>
                    <span className="flex flex-1 justify-center">
                      <span
                        className={`flex h-4 items-center justify-center rounded-sm text-[10px] font-medium text-white transition-all ${
                          sev === 'high'
                            ? 'bg-red-500'
                            : sev === 'medium'
                              ? 'bg-amber-500'
                              : SECTION_COLOR[s.section ?? ''] ?? 'bg-slate-400'
                        }`}
                        style={{ width: `${width}%` }}
                      >
                        {width > 18 ? `${s.step_id} · ${s.reached}` : s.reached}
                      </span>
                    </span>
                    <span className="w-10 shrink-0 text-[9px] text-muted-foreground tabular-nums">
                      {s.conversion_from_start}%
                    </span>
                  </button>
                )
              })}
            </div>
          ) : view === 'heat' ? (
            /* Heatmap: one tile per screen, coloured by how badly it leaks. Built
               for scanning 30+ screens at once — the worst offenders stand out
               without reading a single number. */
            <div className="p-4">
              <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span>Drop rate:</span>
                {[
                  ['bg-emerald-500', 'low'],
                  ['bg-amber-500', 'medium'],
                  ['bg-red-500', 'high'],
                ].map(([cls, label]) => (
                  <span key={label} className="flex items-center gap-1">
                    <span className={`size-3 rounded ${cls}`} />
                    {label}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {steps.map((s) => {
                  const sev = severityOf(s, medianDrop)
                  return (
                    <button
                      key={s.step_id}
                      type="button"
                      onClick={() => setExpanded(expanded === s.step_id ? null : s.step_id)}
                      className={`rounded-lg border p-2.5 text-left transition-colors hover:ring-2 hover:ring-primary/40 ${
                        sev === 'high'
                          ? 'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30'
                          : sev === 'medium'
                            ? 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30'
                            : 'bg-card'
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-xs font-medium">{s.step_id}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                          #{s.step_order}
                        </span>
                      </div>
                      <p className="mt-1 text-lg font-bold tabular-nums">
                        {s.dropped > 0 ? `−${s.dropped}` : '0'}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          of {s.reached}
                        </span>
                      </p>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-muted">
                        <div
                          className={`h-full ${
                            sev === 'high'
                              ? 'bg-red-500'
                              : sev === 'medium'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, s.drop_rate)}%` }}
                        />
                      </div>
                      <p className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground tabular-nums">
                        <span>{s.drop_rate}% left</span>
                        <span>{s.median_seconds != null ? `${s.median_seconds}s` : '—'}</span>
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {/* Column headers — the row below is five bare numbers (%, −1,
                  "7 skip", time) with no labels, unreadable without this. */}
              <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                <span className="w-6 shrink-0" />
                <span className="w-36 shrink-0">Step</span>
                <span className="flex-1">Reached</span>
                <span className="w-11 shrink-0 text-right">Conv.</span>
                <span className="w-14 shrink-0 text-right">Dropped</span>
                <span className="hidden w-14 shrink-0 text-right sm:block">Skipped</span>
                <span className="hidden w-14 shrink-0 text-right sm:block">Time</span>
              </div>
              {steps.map((s) => {
                const sev = severityOf(s, medianDrop)
                const width = Math.max(2, (s.reached / maxReached) * 100)
                const isOpen = expanded === s.step_id
                return (
                  <div key={s.step_id}>
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : s.step_id)}
                      className="flex w-full items-center gap-2 px-3 py-1 text-left hover:bg-muted/50"
                    >
                      <span className="w-6 shrink-0 text-[11px] text-muted-foreground tabular-nums">
                        {s.step_order}
                      </span>

                      <span className="w-36 shrink-0 truncate text-[13px] font-medium">{s.step_id}</span>

                      {/* Bar */}
                      <span className="relative h-4 flex-1 overflow-hidden rounded bg-muted">
                        <span
                          className={`absolute inset-y-0 left-0 ${SECTION_COLOR[s.section ?? ''] ?? 'bg-slate-400'}`}
                          style={{ width: `${width}%` }}
                        />
                        <span className="absolute inset-y-0 left-2 flex items-center text-[11px] font-medium text-foreground/80">
                          {s.reached}
                        </span>
                      </span>

                      <span
                        className="w-11 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums"
                        title="Conversion from the first step"
                      >
                        {s.conversion_from_start}%
                      </span>

                      <span
                        className={`flex w-14 shrink-0 items-center justify-end gap-0.5 text-right text-[11px] font-semibold tabular-nums ${
                          sev === 'high'
                            ? 'text-red-600'
                            : sev === 'medium'
                              ? 'text-amber-600'
                              : 'text-muted-foreground'
                        }`}
                        title="Sessions that dropped off here"
                      >
                        {s.dropped > 0 && <ArrowDown className="size-3 shrink-0" />}
                        {s.dropped > 0 ? s.dropped : '—'}
                      </span>

                      {/* Saw it, never answered it. A screen can look fine on drop
                          rate while being skipped by most of its audience. */}
                      <span
                        className={`hidden w-14 shrink-0 items-center justify-end gap-0.5 text-right text-[11px] tabular-nums sm:flex ${
                          s.viewed_not_answered > 0 && s.reached > 0 && s.viewed_not_answered / s.reached > 0.3
                            ? 'font-semibold text-amber-600'
                            : 'text-muted-foreground'
                        }`}
                        title="Viewed but never answered"
                      >
                        {s.step_type === 'question'
                          ? s.viewed_not_answered > 0
                            ? (
                              <>
                                <SkipForward className="size-3 shrink-0" />
                                {s.viewed_not_answered}
                              </>
                            )
                            : '—'
                          : ''}
                      </span>

                      <span
                        className="hidden w-14 shrink-0 items-center justify-end gap-0.5 text-[11px] text-muted-foreground tabular-nums sm:flex"
                        title="Median time on screen"
                      >
                        <Clock className="size-3 shrink-0" />
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
