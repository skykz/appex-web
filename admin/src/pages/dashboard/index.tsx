import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Users,
  BookOpen,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Activity,
  ChevronRight,
  Flag,
  LogIn,
  MailCheck,
  MailWarning,
  UserMinus,
} from 'lucide-react'
import { dashboardApi, type DashboardRange } from '@features/dashboard/api'
import { StatCard } from '@features/dashboard/stat-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card'
import { PageHeader } from '@shared/ui/page-header'
import { Select } from '@shared/ui/select'
import { Skeleton } from '@shared/ui/skeleton'

const RANGES: Array<{ value: DashboardRange; label: string }> = [
  { value: 'all', label: 'All time' },
  { value: '90d', label: 'Last 90 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '7d', label: 'Last 7 days' },
]

/** Formats an ISO timestamp for compact list display in the admin dashboard. */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Landing-quiz funnel summary: started → reached email → completed, with the
 * drop-off stated outright. Links to /funnel for the per-step breakdown.
 */
function QuizFunnelSection({
  quiz,
  rangeLabel,
  isRanged,
}: {
  quiz: { started: number; completed: number; abandoned: number; completionRate: number; reachedEmail: number }
  rangeLabel: string
  isRanged: boolean
}) {
  const noData = quiz.started === 0

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Landing quiz funnel</h2>
          <p className="text-sm text-muted-foreground">
            Attempts on the marketing quiz{isRanged ? ` · ${rangeLabel.toLowerCase()}` : ''}. Counted
            per attempt, so a repeat visit from the same device counts twice.
          </p>
        </div>
        <Link
          to="/funnel"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Step-by-step drop-off
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      {noData ? (
        <Card className="border-dashed border-border/70">
          <CardContent className="p-6">
            <p className="font-medium">No quiz attempts recorded{isRanged ? ' in this period' : ' yet'}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Attempts appear here once visitors start the quiz on the landing page. If traffic is
              live and this stays empty, per-step tracking may not be reaching the API.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Started quiz"
              value={quiz.started}
              icon={Flag}
              hint="Opened the first screen"
              tone="blue"
            />
            <StatCard
              label="Reached email step"
              value={quiz.reachedEmail}
              icon={LogIn}
              hint={`${pct(quiz.reachedEmail, quiz.started)}% of starts`}
              tone="cyan"
            />
            <StatCard
              label="Finished quiz"
              value={quiz.completed}
              icon={CheckCircle2}
              hint={`${quiz.completionRate}% completion rate`}
              tone="emerald"
            />
            <StatCard
              label="Dropped off"
              value={quiz.abandoned}
              icon={UserMinus}
              hint={`${pct(quiz.abandoned, quiz.started)}% left before the end`}
              tone="rose"
            />
          </div>

          <Card className="border-border/70 shadow-sm">
            <CardContent className="space-y-3 p-5">
              <FunnelBar label="Started" value={quiz.started} total={quiz.started} tone="bg-primary/70" />
              <FunnelBar
                label="Reached email"
                value={quiz.reachedEmail}
                total={quiz.started}
                tone="bg-cyan-500/70"
              />
              <FunnelBar
                label="Finished"
                value={quiz.completed}
                total={quiz.started}
                tone="bg-emerald-500/70"
              />
            </CardContent>
          </Card>
        </>
      )}
    </section>
  )
}

/** One horizontal funnel stage, width proportional to the first stage. */
function FunnelBar({
  label,
  value,
  total,
  tone,
}: {
  label: string
  value: number
  total: number
  tone: string
}) {
  const share = total > 0 ? Math.min(100, (value / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <div className="h-6 flex-1 overflow-hidden rounded-md bg-muted/60">
        <div
          className={`h-full ${tone} transition-[width] duration-500`}
          style={{ width: `${share}%` }}
        />
      </div>
      <span className="w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {value} · {Math.round(share)}%
      </span>
    </div>
  )
}

/** Whole-percent share of `part` in `whole`, guarding division by zero. */
function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0
}

/** Formats a numeric amount as USD for revenue display. */
function formatCurrency(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(n)
}

/** Loads aggregate Supabase metrics and recent activity lists for the admin home screen. */
export function DashboardPage() {
  const [range, setRange] = useState<DashboardRange>('all')
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'dashboard', range],
    queryFn: () => dashboardApi.stats(range),
  })
  const rangeLabel = RANGES.find((r) => r.value === range)?.label ?? 'All time'
  const isRanged = range !== 'all'

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {/* Matches the eight tiles rendered below, so the layout doesn't jump. */}
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive shadow-sm">
        Failed to load dashboard: {(error as Error)?.message ?? 'Unknown error'}
      </div>
    )
  }

  const t = data.totals
  const activeRate =
    t.users > 0 ? Math.round((t.activeToday / t.users) * 100) : 0

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Admin"
        title="Dashboard"
        description="Key growth and learning metrics at a glance."
        actions={
          <div className="flex items-center gap-2">
            <label htmlFor="dash-range" className="sr-only">
              Date range
            </label>
            <Select
              id="dash-range"
              className="h-10 w-44 border-border/80 shadow-sm"
              value={range}
              onChange={(e) => setRange(e.target.value as DashboardRange)}
            >
              {RANGES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label={isRanged ? 'New users' : 'Total users'}
          value={t.users}
          icon={Users}
          hint={isRanged ? `Signed up · ${rangeLabel.toLowerCase()}` : undefined}
          tone="blue"
          to="/users?tab=customers"
        />
        <StatCard
          label="Active today"
          value={t.activeToday}
          icon={Activity}
          hint={`${activeRate}% of users checked in`}
          tone="orange"
        />
        <StatCard
          label="Skills (courses)"
          value={t.skills}
          icon={BookOpen}
          hint={isRanged ? 'Catalog size — not date-filtered' : undefined}
          tone="violet"
          to="/courses"
        />
        <StatCard
          label="Lessons completed"
          value={t.lessonsCompleted}
          icon={CheckCircle2}
          hint={isRanged ? rangeLabel : undefined}
          tone="emerald"
        />
        <StatCard
          label="Active subscriptions"
          value={t.activeSubscriptions}
          icon={CreditCard}
          hint={isRanged ? 'Live count — not date-filtered' : undefined}
          tone="amber"
          to="/billing"
        />
        <StatCard
          label="Revenue"
          value={formatCurrency(t.revenue)}
          icon={DollarSign}
          hint={isRanged ? rangeLabel : 'All-time billing'}
          tone="orange"
          to="/billing"
        />
        {/* Lead confirmation state. Rendered as a dash until migration 041 adds
            `confirmed_at`, rather than showing a misleading 0. */}
        <StatCard
          label="Confirmed leads"
          value={t.confirmedLeads ?? '—'}
          icon={MailCheck}
          hint={t.confirmedLeads == null ? 'Pending migration' : 'Clicked the email link · no purchase'}
          tone="cyan"
          to={t.confirmedLeads == null ? undefined : '/users?tab=confirmed'}
        />
        <StatCard
          label="Unconfirmed leads"
          value={t.unconfirmedLeads ?? '—'}
          icon={MailWarning}
          hint={t.unconfirmedLeads == null ? 'Pending migration' : 'Left an email · never confirmed'}
          tone="rose"
          to={t.unconfirmedLeads == null ? undefined : '/users?tab=unconfirmed'}
        />
      </section>

      <QuizFunnelSection quiz={data.quiz} rangeLabel={rangeLabel} isRanged={isRanged} />

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle>Recent signups</CardTitle>
            <CardDescription>Latest learner accounts</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentUsers.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">No signups yet.</div>
            ) : (
              <ul className="divide-y">
                {data.recentUsers.map((u) => (
                  <li key={u.id}>
                    <Link
                      to={`/users?q=${encodeURIComponent(u.id)}`}
                      className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-orange-50/40"
                    >
                      <div>
                        <div className="text-sm font-medium">{u.name || '—'}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">{formatDate(u.created_at)}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle>Recent lesson completions</CardTitle>
            <CardDescription>Latest finished lessons</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentLessonsCompleted.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                No lesson completions yet.
              </div>
            ) : (
              <ul className="divide-y">
                {data.recentLessonsCompleted.map((l) => (
                  <li key={`${l.user_id}-${l.lesson_title}-${l.completed_at}`}>
                    <Link
                      to={`/users?q=${encodeURIComponent(l.user_id || l.user_email)}`}
                      className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-sky-50/50"
                    >
                      <div>
                        <div className="text-sm font-medium">{l.lesson_title}</div>
                        <div className="text-xs text-muted-foreground">{l.user_email}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(l.completed_at)}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
