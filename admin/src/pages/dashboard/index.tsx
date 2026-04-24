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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(n)
}

export function DashboardPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: dashboardApi.stats,
  })

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-sm text-muted-foreground">Loading dashboard…</div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="p-8">
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load dashboard: {(error as Error)?.message ?? 'Unknown error'}
        </div>
      </div>
    )
  }

  const t = data.totals

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Live data from Supabase.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Total users" value={t.users} icon={Users} />
        <StatCard label="Active today" value={t.activeToday} icon={Activity} hint="Checked in today" />
        <StatCard label="Skills (courses)" value={t.skills} icon={BookOpen} />
        <StatCard label="Modules" value={t.modules} icon={Layers} />
        <StatCard label="Lessons" value={t.lessons} icon={GraduationCap} />
        <StatCard label="Lessons completed" value={t.lessonsCompleted} icon={CheckCircle2} />
        <StatCard label="Chat sessions" value={t.chatSessions} icon={MessageSquare} />
        <StatCard label="Chat messages" value={t.chatMessages} icon={FileText} />
        <StatCard label="Active subs" value={t.activeSubscriptions} icon={CreditCard} />
        <StatCard
          label="Total revenue"
          value={formatCurrency(t.revenue)}
          icon={DollarSign}
          hint="All-time billing"
        />
        <StatCard label="Credits pool" value={t.creditsRemaining} icon={Coins} hint="Remaining user credits" />
        <StatCard label="Support inbox" value={t.contactMessages} icon={Mail} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent signups</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentUsers.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">No signups yet.</div>
            ) : (
              <ul className="divide-y">
                {data.recentUsers.map((u) => (
                  <li key={u.id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <div className="text-sm font-medium">{u.name || '—'}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDate(u.created_at)}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
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
                  <li key={i} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <div className="text-sm font-medium">{l.lesson_title}</div>
                      <div className="text-xs text-muted-foreground">{l.user_email}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(l.completed_at)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Signups — last 14 days</CardTitle>
        </CardHeader>
        <CardContent>
          <SignupBars data={data.signupsByDay} />
        </CardContent>
      </Card>
    </div>
  )
}

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
              className="w-full rounded-t bg-primary/80"
              style={{ height: `${(d.count / max) * 100}%` }}
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
