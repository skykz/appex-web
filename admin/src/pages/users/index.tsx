import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronRight, Download, Loader2, Mail, Trash2 } from 'lucide-react'
import type { AdminLeadRow, AdminUserRow } from '@features/users/api'
import {
  deleteAdminLead,
  fetchAdminLeads,
  fetchAdminUsers,
  resendLeadConfirmEmail,
  type LeadStatusFilter,
} from '@features/users/api'
import { buildLeadsCsv, buildUsersCsv } from '@features/users/csv'
import { downloadCsvFile } from '@shared/lib/csv'
import { Button } from '@shared/ui/button'
import { DestructiveConfirmDialog } from '@shared/ui/destructive-confirm-dialog'
import { PageHeader } from '@shared/ui/page-header'
import { Pagination } from '@shared/ui/pagination'
import { QueryErrorPanel } from '@shared/ui/query-error-panel'
import { SearchToolbar } from '@shared/ui/search-toolbar'
import { Skeleton } from '@shared/ui/skeleton'
import { DataTable, type Column } from '@shared/ui/data-table'
import { cn } from '@shared/lib'

const PAGE_SIZE = 25

/**
 * Three distinct populations, deliberately not two:
 *  - customers  — rows in `users`, i.e. someone who paid.
 *  - confirmed  — lead who clicked the emailed confirm link but has not paid.
 *  - unconfirmed— lead who typed an email and never confirmed it.
 * "Confirmed" used to mean "has an account", which was wrong: confirming an
 * address and buying are independent facts.
 */
type Tab = 'customers' | 'confirmed' | 'unconfirmed'

/**
 * Leads first, customers last: the lead tabs are the ones that need action, and
 * this is also the arrow-key order inside the tablist.
 */
const TABS: ReadonlyArray<{ value: Tab; label: string }> = [
  { value: 'unconfirmed', label: 'Unconfirmed leads' },
  { value: 'confirmed', label: 'Confirmed leads' },
  { value: 'customers', label: 'Customers' },
]

const TAB_ORDER: readonly Tab[] = TABS.map((t) => t.value)

/**
 * Searchable, paginated people directory backed by server-side filters; supports deep-link ?q= and CSV export.
 *
 * Three tabs, because paying and confirming an email are independent facts:
 * "Customers" lists `users` (accounts, created on payment), while the two lead tabs
 * list quiz submissions split by whether the emailed confirm link was clicked.
 */
export function UsersPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const qFromUrl = searchParams.get('q') ?? ''
  // Deep-linkable so the dashboard tiles can open a specific list directly.
  const tabFromUrl = searchParams.get('tab')
  // Defaults to unconfirmed leads: those are the rows that need action (chase or
  // delete), whereas customers are a settled list you look up on purpose.
  const [tab, setTab] = useState<Tab>(
    tabFromUrl === 'confirmed' || tabFromUrl === 'customers' ? tabFromUrl : 'unconfirmed'
  )
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const deferredSearch = useDeferredValue(search.trim())
  const [deleteTarget, setDeleteTarget] = useState<AdminLeadRow | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (qFromUrl) setSearch(qFromUrl)
  }, [qFromUrl])

  // Follow ?tab= on later navigations too: arriving here from a dashboard tile
  // while already on this page does not remount the component, so the initial
  // useState value alone would leave the wrong tab selected.
  useEffect(() => {
    if (tabFromUrl === 'confirmed' || tabFromUrl === 'unconfirmed') setTab(tabFromUrl)
    else if (tabFromUrl === 'customers') setTab('customers')
  }, [tabFromUrl])

  useEffect(() => {
    setPage(1)
  }, [deferredSearch, tab])

  const usersQuery = useQuery({
    queryKey: ['admin', 'users', deferredSearch, page, PAGE_SIZE],
    queryFn: () =>
      fetchAdminUsers({ search: deferredSearch || undefined, page, limit: PAGE_SIZE }),
    enabled: tab === 'customers',
  })

  // Both lead tabs share one query whose key includes the status, so switching
  // between them refetches instead of showing the other tab's cached rows.
  const leadStatus: LeadStatusFilter = tab === 'confirmed' ? 'confirmed' : 'unconfirmed'
  const leadsQuery = useQuery({
    queryKey: ['admin', 'leads', leadStatus, deferredSearch, page, PAGE_SIZE],
    queryFn: () =>
      fetchAdminLeads({
        search: deferredSearch || undefined,
        status: leadStatus,
        page,
        limit: PAGE_SIZE,
      }),
    enabled: tab !== 'customers',
    // Hold the previous response while the next one loads: without this, changing
    // tab or page empties `data` for a frame and the badge numbers visibly blink.
    placeholderData: (prev) => prev,
  })

  const removeLead = useMutation({
    mutationFn: (id: string) => deleteAdminLead(id),
    onSuccess: () => {
      setDeleteTarget(null)
      setDeleteError(null)
      // Deleting the only row on a page would otherwise leave the operator staring
      // at an empty table with no obvious way back — refetching page N returns the
      // same empty slice. Step back a page when that was the last row on it.
      if (leadsQuery.data?.items.length === 1 && page > 1) setPage(page - 1)
      // Invalidate by prefix so BOTH lead tabs refetch: a deleted row must not
      // linger in the other tab's cache, and the totals would drift otherwise.
      void qc.invalidateQueries({ queryKey: ['admin', 'leads'] })
    },
    onError: (err: unknown) => {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete this lead.')
    },
  })

  // Per-row send feedback. Keyed by lead id because several rows can be acted on
  // in sequence and a single shared message would attach to the wrong one.
  const [sendResult, setSendResult] = useState<{ id: string; ok: boolean; text: string } | null>(
    null
  )

  const sendConfirmEmail = useMutation({
    mutationFn: (id: string) => resendLeadConfirmEmail(id),
    onSuccess: (_data, id) => {
      setSendResult({ id, ok: true, text: 'Email sent' })
      // Refetch so the "Email confirmed" column flips to "Awaiting click".
      void qc.invalidateQueries({ queryKey: ['admin', 'leads'] })
    },
    onError: (err: unknown, id) => {
      setSendResult({
        id,
        ok: false,
        text: err instanceof Error ? err.message : 'Could not send the email.',
      })
    },
  })

  /**
   * Badge numbers.
   *
   * Lead counts come from whichever lead response is currently cached — both lead
   * tabs return both numbers, so switching tabs does not blank the badges. They
   * stay undefined until the first lead fetch lands, and on the customers tab
   * (where no lead query runs) the last known values persist.
   *
   * Customers has no badge: `usersQuery.total` counts the current search only, so
   * a number there would mean something different from the lead badges.
   */
  const tabCounts: Record<Tab, number | undefined> = {
    unconfirmed: leadsQuery.data?.counts.unconfirmed,
    confirmed: leadsQuery.data?.counts.confirmed,
    customers: undefined,
  }

  // Read every derived value off the SAME query object for the active tab, so a
  // stray render can't mix `total` from one tab with `isLoading`/rows from the other.
  const active = tab === 'customers' ? usersQuery : leadsQuery
  const isLoading = active.isLoading
  const isError = active.isError
  const rows = usersQuery.data?.items ?? []
  const total = active.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  /**
   * True while the table is showing the previous tab's or page's rows.
   *
   * placeholderData keeps the badges from blinking, but it also means `isLoading`
   * stays false during a tab switch — so without this the operator would briefly
   * read stale rows as if they belonged to the tab they just opened.
   */
  const isStale = active.isPlaceholderData

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
      {
        key: 'open',
        header: '',
        className: 'w-10 text-right',
        render: () => (
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" aria-hidden />
        ),
      },
    ],
    []
  )

  const leadColumns: Column<AdminLeadRow>[] = useMemo(
    () => [
      {
        key: 'lead',
        header: 'Lead',
        render: (l) => (
          <div>
            <div className="font-medium">{l.name || '—'}</div>
            <div className="text-xs text-muted-foreground">{l.email}</div>
          </div>
        ),
      },
      {
        key: 'plan',
        header: 'Selected plan',
        render: (l) =>
          l.selected_plan ? (
            <span className="font-medium">{l.selected_plan}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        key: 'source',
        header: 'UTM source',
        render: (l) => (
          <span className={l.utm_source ? 'text-sm' : 'text-muted-foreground'}>
            {l.utm_source || '—'}
          </span>
        ),
      },
      {
        key: 'confirmed',
        header: 'Email confirmed',
        render: (l) =>
          l.confirmed_at ? (
            <span
              className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
              title={new Date(l.confirmed_at).toLocaleString()}
            >
              Confirmed
            </span>
          ) : l.confirm_email_sent_at ? (
            <span
              className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
              title={`Confirmation email sent ${new Date(l.confirm_email_sent_at).toLocaleString()}`}
            >
              Awaiting click
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Not emailed</span>
          ),
      },
      {
        key: 'welcome',
        header: 'Welcome email',
        render: (l) => (
          <span
            className={cn(
              'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold',
              l.welcome_email_sent_at
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                : 'border-border/80 text-muted-foreground'
            )}
            title={
              l.welcome_email_sent_at
                ? new Date(l.welcome_email_sent_at).toLocaleString()
                : undefined
            }
          >
            {l.welcome_email_sent_at ? 'Sent' : 'Not sent'}
          </span>
        ),
      },
      {
        key: 'created',
        header: 'Created',
        render: (l) => (
          <span className="text-muted-foreground">
            {new Date(l.created_at).toLocaleDateString()}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        className: 'w-24 text-right',
        render: (l) => {
          const sending = sendConfirmEmail.isPending && sendConfirmEmail.variables === l.id
          const result = sendResult?.id === l.id ? sendResult : null
          // Nothing to confirm once they already did — offering the button would
          // only let an operator mail a redundant "please confirm" request.
          const canSend = !l.confirmed_at

          return (
            <div className="flex items-center justify-end gap-1">
              {result ? (
                <span
                  className={cn(
                    'mr-1 text-xs',
                    result.ok ? 'text-emerald-600' : 'text-destructive'
                  )}
                  // Announce the outcome: the icon-only button gives no other cue.
                  role="status"
                  title={result.text}
                >
                  {result.ok ? 'Sent' : 'Failed'}
                </span>
              ) : null}
              {canSend ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-primary"
                  disabled={sending}
                  aria-label={`Send confirmation email to ${l.email}`}
                  title={`Send confirmation email to ${l.email}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSendResult(null)
                    sendConfirmEmail.mutate(l.id)
                  }}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Mail className="h-4 w-4" aria-hidden />
                  )}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Delete lead ${l.email}`}
                onClick={(e) => {
                  // Rows may become clickable later; don't let this bubble into a
                  // navigation the operator didn't ask for.
                  e.stopPropagation()
                  // Clear the previous attempt's state, or a failure on one lead
                  // would greet the operator as an error on the next one they open.
                  removeLead.reset()
                  setDeleteError(null)
                  setDeleteTarget(l)
                }}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          )
        },
      },
    ],
    // Everything referenced in the action buttons must be a dependency, or the
    // memo would keep closures over stale mutation/feedback state.
    [removeLead, sendConfirmEmail, sendResult]
  )

  async function exportCsv() {
    if (tab === 'customers') {
      const chunk = await fetchAdminUsers({
        search: deferredSearch || undefined,
        page: 1,
        limit: 500,
      })
      const csv = buildUsersCsv(chunk.items)
      downloadCsvFile(csv, 'appex-users.csv')
    } else {
      const chunk = await fetchAdminLeads({
        search: deferredSearch || undefined,
        status: leadStatus,
        page: 1,
        limit: 500,
      })
      const csv = buildLeadsCsv(chunk.items)
      // Filename carries the status so two exports don't overwrite each other.
      downloadCsvFile(csv, `appex-leads-${leadStatus}.csv`)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        badge="People"
        title="Users"
        description="Paying customers and funnel leads, with server-side search and pagination."
      />

      {/* Segmented control rather than three separate buttons: the tabs are one
          choice, and a shared track makes that read at a glance. */}
      <div
        className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-border/70 bg-muted/40 p-1"
        role="tablist"
        aria-label="People lists"
        onKeyDown={(e) => {
          // Arrow-key movement is expected of a tablist; without it the group is
          // keyboard-reachable but not keyboard-navigable.
          const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
          if (!step) return
          e.preventDefault()
          const i = TAB_ORDER.indexOf(tab)
          setTab(TAB_ORDER[(i + step + TAB_ORDER.length) % TAB_ORDER.length]!)
        }}
      >
        {TABS.map(({ value, label }) => {
          const selected = tab === value
          const count = tabCounts[value]
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={selected}
              // Only the active tab is a tab stop; arrows move between them.
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(value)}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                selected
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
              {count != null ? (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                    selected ? 'bg-primary/10 text-primary' : 'bg-muted-foreground/15'
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <SearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search by name or email…"
        label={tab === 'customers' ? 'Search customers' : 'Search leads'}
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
        <QueryErrorPanel
          error={active.error}
          what={tab === 'customers' ? 'users' : 'leads'}
          onRetry={() => active.refetch()}
        />
      ) : tab === 'customers' ? (
        <>
          <DataTable
            rows={rows}
            columns={columns}
            getRowKey={(u) => u.id}
            onRowClick={(u) => navigate(`/users/${u.id}`)}
            empty={
              deferredSearch ? `No users match “${deferredSearch}”.` : 'No users yet.'
            }
          />
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            total={total}
            itemNoun="user"
          />
        </>
      ) : (
        // Dim while the rows still belong to the previous tab or page, so stale
        // data is never mistaken for the list that was just requested.
        <div className={cn('space-y-4 transition-opacity', isStale && 'opacity-50')}>
          <DataTable
            rows={leadsQuery.data?.items ?? []}
            columns={leadColumns}
            getRowKey={(l) => l.id}
            empty={
              deferredSearch
                ? `No leads match “${deferredSearch}”.`
                : tab === 'confirmed'
                  ? 'No confirmed leads yet.'
                  : 'No unconfirmed leads.'
            }
          />
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            total={total}
            itemNoun="lead"
          />
        </div>
      )}

      <DestructiveConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => {
          // Don't discard state mid-request: closing while the delete is in
          // flight would hide the pending state and any error it returns.
          if (o || removeLead.isPending) return
          setDeleteTarget(null)
          setDeleteError(null)
        }}
        title="Delete this lead?"
        description={
          deleteTarget
            ? `Permanently delete ${deleteTarget.email}? This also removes their quiz answers and email-confirmation status. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete lead"
        isPending={removeLead.isPending}
        errorMessage={deleteError}
        onConfirm={() => {
          if (deleteTarget) removeLead.mutate(deleteTarget.id)
        }}
      />
    </div>
  )
}
