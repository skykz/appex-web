import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { httpClient } from '@shared/api/http-client'
import { Input } from '@shared/ui/input'
import { Card, CardContent } from '@shared/ui/card'
import { PageHeader } from '@shared/ui/page-header'
import { Skeleton } from '@shared/ui/skeleton'
import { DataTable, type Column } from '@shared/ui/data-table'

interface AdminUserRow {
  id: string
  email: string
  name: string
  role: string
  created_at: string
  credits: number
  streak_current: number
}

/**
 * Searchable directory of all registered users with credits and streak columns.
 */
export function UsersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => httpClient.get<AdminUserRow[]>('/admin/users'),
  })
  const [search, setSearch] = useState('')

  const rows = useMemo(() => {
    const list = data ?? []
    if (!search.trim()) return list
    const s = search.toLowerCase()
    return list.filter(
      (u) => u.email.toLowerCase().includes(s) || u.name.toLowerCase().includes(s)
    )
  }, [data, search])

  const columns: Column<AdminUserRow>[] = [
    {
      key: 'user',
      header: 'User',
      render: (u) => (
        <div>
          <div className="font-medium">{u.name || '—'}</div>
          <div className="text-xs text-muted-foreground">{u.email}</div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (u) => (
        <span
          className={
            u.role === 'admin'
              ? 'inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary'
              : 'text-xs text-muted-foreground'
          }
        >
          {u.role}
        </span>
      ),
    },
    {
      key: 'credits',
      header: 'Credits',
      render: (u) => <span className="tabular-nums font-medium">{u.credits}</span>,
    },
    {
      key: 'streak',
      header: 'Streak',
      render: (u) => <span className="tabular-nums text-muted-foreground">{u.streak_current}</span>,
    },
    {
      key: 'joined',
      header: 'Joined',
      render: (u) => (
        <span className="text-muted-foreground">
          {new Date(u.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-8">
      <PageHeader badge="People" title="Users" description="All registered users and their engagement signals." />

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 border-border/80 pl-9 shadow-sm"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3 rounded-xl border border-border/80 bg-card p-6 shadow-sm">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <DataTable rows={rows} columns={columns} getRowKey={(u) => u.id} />
      )}
    </div>
  )
}
