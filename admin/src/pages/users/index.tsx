import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { httpClient } from '@shared/api/http-client'
import { Input } from '@shared/ui/input'
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
              ? 'rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'
              : 'text-xs text-muted-foreground'
          }
        >
          {u.role}
        </span>
      ),
    },
    { key: 'credits', header: 'Credits', render: (u) => u.credits },
    { key: 'streak', header: 'Streak', render: (u) => u.streak_current },
    {
      key: 'joined',
      header: 'Joined',
      render: (u) => new Date(u.created_at).toLocaleDateString(),
    },
  ]

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground">All registered users.</p>
      </div>

      <div className="relative w-80">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <DataTable rows={rows} columns={columns} getRowKey={(u) => u.id} />
      )}
    </div>
  )
}
