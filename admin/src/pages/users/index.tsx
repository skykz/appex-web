import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import type { AdminUserRow } from '@features/users/api'
import { fetchAdminUsers } from '@features/users/api'
import { downloadCsvFile, toCsv } from '@shared/lib/csv'
import { Button } from '@shared/ui/button'
import { PageHeader } from '@shared/ui/page-header'
import { Pagination } from '@shared/ui/pagination'
import { QueryErrorPanel } from '@shared/ui/query-error-panel'
import { SearchToolbar } from '@shared/ui/search-toolbar'
import { Skeleton } from '@shared/ui/skeleton'
import { DataTable, type Column } from '@shared/ui/data-table'

const PAGE_SIZE = 25

/**
 * Builds a CSV string from user rows with RFC-style quoted fields where needed.
 */
function buildUsersCsv(rows: AdminUserRow[]): string {
  return toCsv(
    ['id', 'email', 'name', 'role', 'created_at', 'credits', 'streak_current'],
    rows,
    (r) => [r.id, r.email, r.name ?? '', r.role, r.created_at, r.credits, r.streak_current]
  )
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

  const { data, isLoading, isError, error, refetch } = useQuery({
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

      <SearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search by name or email…"
        label="Search users"
        actions={
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            Export CSV (up to 500)
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3 rounded-xl border border-border/80 bg-card p-6 shadow-sm">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : isError ? (
        <QueryErrorPanel error={error} what="users" onRetry={() => refetch()} />
      ) : (
        <>
          <DataTable rows={rows} columns={columns} getRowKey={(u) => u.id} />
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            total={total}
            itemNoun="user"
          />
        </>
      )}
    </div>
  )
}
