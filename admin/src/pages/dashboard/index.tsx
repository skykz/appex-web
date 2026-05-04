import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Users,
  BookOpen,
  Layers,
  GraduationCap,
  MessageSquare,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Coins,
  Mail,
  Activity,
  FileText,
} from 'lucide-react'
import { dashboardApi } from '@features/dashboard/api'
import { StatCard } from '@features/dashboard/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/card'
import { PageHeader } from '@shared/ui/page-header'
import { Skeleton } from '@shared/ui/skeleton'

/** Formats an ISO timestamp for compact list display in the admin dashboard. */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: dashboardApi.stats,
  })

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
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

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Admin"
        title="Dashboard"
        description="Live metrics and recent activity from Supabase."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Total users" value={t.users} icon={Users} tone="blue" />
        <StatCard
          label="Active today"
          value={t.activeToday}
          icon={Activity}
          hint="Checked in today"
          tone="orange"
        />
        <StatCard label="Skills (courses)" value={t.skills} icon={BookOpen} tone="violet" />
        <StatCard label="Modules" value={t.modules} icon={Layers} tone="slate" />
        <StatCard label="Lessons" value={t.lessons} icon={GraduationCap} tone="cyan" />
        <StatCard
          label="Lessons completed"
          value={t.lessonsCompleted}
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard label="Chat sessions" value={t.chatSessions} icon={MessageSquare} tone="violet" />
        <StatCard label="Chat messages" value={t.chatMessages} icon={FileText} tone="cyan" />
        <StatCard label="Active subs" value={t.activeSubscriptions} icon={CreditCard} tone="amber" />
        <StatCard
          label="Total revenue"
          value={formatCurrency(t.revenue)}
          icon={DollarSign}
          hint="All-time billing"
          tone="orange"
        />
        <StatCard
          label="Credits pool"
          value={t.creditsRemaining}
          icon={Coins}
          hint="Remaining user credits"
          tone="emerald"
        />
        <StatCard label="Support inbox" value={t.contactMessages} icon={Mail} tone="rose" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle>Recent signups</CardTitle>
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
          </CardHeader>
          <CardContent className="p-0">
            {data.recentLessonsCompleted.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                No lesson completions yet.
              </div>
            ) : (
              <ul className="divide-y">
                {data.recentLessonsCompleted.map((l, i) => (
                  <li key={i}>
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
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle>Signups — last 14 days</CardTitle>
        </CardHeader>
        <CardContent>
          <SignupBars data={data.signupsByDay} />
        </CardContent>
      </Card>
    </div>
  )
}

/** Renders a simple bar chart for daily signup counts over the last two weeks. */
function SignupBars({ data }: { data: Array<{ date: string; count: number }> }) {
  if (data.length === 0) {
    return <div className="text-sm text-muted-foreground">No signups recorded.</div>
  }
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <div className="flex h-40 items-end gap-2">
      {data.map((d) => (
        <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-md shadow-sm transition-transform hover:scale-[1.02]"
              style={{
                height: `${(d.count / max) * 100}%`,
                background: 'linear-gradient(180deg, hsl(45 96% 88%) 0%, hsl(32 95% 52%) 100%)',
                boxShadow: '0 2px 8px rgba(201, 118, 3, 0.2)',
              }}
              title={`${d.count} signups`}
            />
          </div>
          <div className="text-[10px] text-muted-foreground">
            {new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </div>
          <div className="text-xs font-medium">{d.count}</div>
        </div>
      ))}
    </div>
  )
}
