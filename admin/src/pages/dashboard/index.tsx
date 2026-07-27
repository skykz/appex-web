import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Users,
  BookOpen,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Activity,
} from 'lucide-react'
import { dashboardApi } from '@features/dashboard/api'
import { StatCard } from '@features/dashboard/stat-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card'
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
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
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total users" value={t.users} icon={Users} tone="blue" />
        <StatCard
          label="Active today"
          value={t.activeToday}
          icon={Activity}
          hint={`${activeRate}% of users checked in`}
          tone="orange"
        />
        <StatCard label="Skills (courses)" value={t.skills} icon={BookOpen} tone="violet" />
        <StatCard
          label="Lessons completed"
          value={t.lessonsCompleted}
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          label="Active subscriptions"
          value={t.activeSubscriptions}
          icon={CreditCard}
          tone="amber"
        />
        <StatCard
          label="Total revenue"
          value={formatCurrency(t.revenue)}
          icon={DollarSign}
          hint="All-time billing"
          tone="orange"
        />
      </section>

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
