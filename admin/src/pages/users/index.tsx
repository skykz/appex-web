import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Download, Search } from 'lucide-react'
import type { AdminUserRow } from '@features/users/api'
import { fetchAdminUsers } from '@features/users/api'
import { Button } from '@shared/ui/button'
import { Input } from '@shared/ui/input'
import { Card, CardContent } from '@shared/ui/card'
import { PageHeader } from '@shared/ui/page-header'
import { Skeleton } from '@shared/ui/skeleton'
import { DataTable, type Column } from '@shared/ui/data-table'

const PAGE_SIZE = 25

/**
 * Builds a CSV string from user rows with RFC-style quoted fields where needed.
 */
function buildUsersCsv(rows: AdminUserRow[]): string {
  const headers = ['id', 'email', 'name', 'role', 'created_at', 'credits', 'streak_current'] as const
  const esc = (v: string) => {
    if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`
    return v
  }
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        esc(r.id),
        esc(r.email),
        esc(r.name ?? ''),
        esc(r.role),
        esc(r.created_at),
        esc(String(r.credits)),
        esc(String(r.streak_current)),
      ].join(',')
    ),
  ]
  return lines.join('\r\n')
}

/**
 * Triggers a browser download of the given CSV text as appex-users.csv.
 */
function downloadCsvFile(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Searchable, paginated user directory backed by server-side filters; supports deep-link ?q= and CSV export.
 */
export function UsersPage() {
  const [searchParams] = useSearchParams()
  const qFromUrl = searchParams.get('q') ?? ''
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const deferredSearch = useDeferredValue(search.trim())

  useEffect(() => {
    if (qFromUrl) setSearch(qFromUrl)
  }, [qFromUrl])

  useEffect(() => {
    setPage(1)
  }, [deferredSearch])

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', deferredSearch, page, PAGE_SIZE],
    queryFn: () =>
      fetchAdminUsers({ search: deferredSearch || undefined, page, limit: PAGE_SIZE }),
  })

  const rows = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const columns: Column<AdminUserRow>[] = useMemo(
    () => [
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
    ],
    []
  )

  async function exportCsv() {
    const chunk = await fetchAdminUsers({
      search: deferredSearch || undefined,
      page: 1,
      limit: 500,
    })
    const csv = buildUsersCsv(chunk.items)
    downloadCsvFile(csv, 'appex-users.csv')
  }

  return (
    <div className="space-y-8">
      <PageHeader
        badge="People"
        title="Users"
        description="Registered users with server-side search and pagination."
      />

      <Card className="border-border/70 shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 border-border/80 pl-9 shadow-sm"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button type="button" variant="outline" size="sm" className="shrink-0 gap-2" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            Export CSV (up to 500)
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3 rounded-xl border border-border/80 bg-card p-6 shadow-sm">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <>
          <DataTable rows={rows} columns={columns} getRowKey={(u) => u.id} />
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {total} user{total === 1 ? '' : 's'}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
