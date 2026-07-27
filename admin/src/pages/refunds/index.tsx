import { useDeferredValue, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchAdminRefunds, type AdminRefundRow, type RefundDecision } from '@features/refunds/api'
import { Card, CardContent } from '@shared/ui/card'
import { Checkbox } from '@shared/ui/checkbox'
import { DataTable, type Column } from '@shared/ui/data-table'
import { PageHeader } from '@shared/ui/page-header'
import { Pagination } from '@shared/ui/pagination'
import { QueryErrorPanel } from '@shared/ui/query-error-panel'
import { SearchToolbar } from '@shared/ui/search-toolbar'
import { Select } from '@shared/ui/select'
import { Skeleton } from '@shared/ui/skeleton'

const PAGE_SIZE = 25

type DecisionFilter = 'all' | RefundDecision

/**
 * Audit queue of refund decisions. Denied rows are shown alongside approved ones —
 * the record of what support declined is as operationally useful as what it paid out.
 */
export function RefundsPage() {
  const [search, setSearch] = useState('')
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>('all')
  const [stripeOnly, setStripeOnly] = useState(false)
  const [page, setPage] = useState(1)
  const deferredSearch = useDeferredValue(search.trim())

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'refunds', deferredSearch, decisionFilter, page, PAGE_SIZE],
    queryFn: () =>
      fetchAdminRefunds({
        search: deferredSearch || undefined,
        decision: decisionFilter === 'all' ? undefined : decisionFilter,
        page,
        limit: PAGE_SIZE,
      }),
  })

  /** Updates a filter and returns to page 1 so results are never viewed on a stale page. */
  function updateFilter(fn: () => void) {
    fn()
    setPage(1)
  }

  const serverRows = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Stripe-executed filtering is client-side on the current page only; label it as such
  // rather than implying it filters the whole result set.
  const rows = stripeOnly ? serverRows.filter((r) => r.stripe_refund_id) : serverRows

  const columns: Column<AdminRefundRow>[] = useMemo(
    () => [
      {
        key: 'user',
        header: 'Customer',
        render: (r) => (
          <div className="min-w-0">
            <div className="font-medium">{r.name || '—'}</div>
            <div className="text-xs text-muted-foreground">{r.email}</div>
          </div>
        ),
      },
      {
        key: 'decision',
        header: 'Decision',
        render: (r) => (
          <span
            className={
              r.decision === 'approved'
                ? 'inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300'
                : 'inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-200'
            }
          >
            {r.decision}
          </span>
        ),
      },
      {
        key: 'reason',
        header: 'Reason',
        render: (r) => (
          <div className="min-w-0 max-w-xs">
            <code className="rounded bg-muted/50 px-1.5 py-0.5 text-[11px] font-mono">
              {r.reason_code}
            </code>
            {r.courtesy_applied ? (
              <span className="ml-1.5 inline-flex rounded-full border border-border/60 px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                courtesy
              </span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'amount',
        header: 'Amount',
        render: (r) => (
          <span className="tabular-nums font-medium">
            {r.amount != null ? `$${r.amount.toFixed(2)}` : '—'}
          </span>
        ),
      },
      {
        key: 'engagement',
        header: 'Engagement',
        render: (r) => (
          <span className="text-xs tabular-nums text-muted-foreground">
            {r.lessons_opened} opened · {r.lessons_completed} done
            {r.days_since_purchase != null ? ` · d+${r.days_since_purchase}` : ''}
          </span>
        ),
      },
      {
        key: 'stripe',
        header: 'Stripe',
        render: (r) =>
          r.stripe_refund_id ? (
            <code className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-mono text-emerald-700 dark:text-emerald-300">
              {r.stripe_refund_id}
            </code>
          ) : (
            <span className="text-xs text-muted-foreground">not issued</span>
          ),
      },
      {
        key: 'processed',
        header: 'By / when',
        render: (r) => (
          <div className="text-xs text-muted-foreground">
            <div>{r.processed_by_email ?? 'system'}</div>
            <div>{new Date(r.created_at).toLocaleString()}</div>
          </div>
        ),
      },
    ],
    []
  )

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Revenue"
        title="Refunds"
        description="Every refund decision the policy engine has recorded, approved or denied."
      />

      <SearchToolbar
        value={search}
        onChange={(v) => updateFilter(() => setSearch(v))}
        label="Search refunds"
        placeholder="Search customer email, name, user id, reason, or Stripe refund id…"
      />

      <Card className="border-border/70 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="w-full sm:w-56">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="refund-decision">
              Decision
            </label>
            <Select
              id="refund-decision"
              className="mt-1 h-10 w-full border-border/80 shadow-sm"
              value={decisionFilter}
              onChange={(e) => updateFilter(() => setDecisionFilter(e.target.value as DecisionFilter))}
            >
              <option value="all">All decisions</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
            </Select>
          </div>
          <div className="flex h-10 items-center gap-3 sm:ml-auto">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={stripeOnly} onChange={(e) => setStripeOnly(e.target.checked)} />
              Stripe-issued only
              <span className="text-xs text-muted-foreground">(this page)</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3 rounded-xl border border-border/80 bg-card p-6 shadow-sm" aria-busy="true">
          <span className="sr-only">Loading refunds…</span>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : isError ? (
        <QueryErrorPanel error={error} what="refunds" onRetry={() => refetch()} />
      ) : (
        <>
          <DataTable
            rows={rows}
            columns={columns}
            getRowKey={(r) => r.id}
            empty={
              deferredSearch || decisionFilter !== 'all' || stripeOnly
                ? 'No refunds match these filters.'
                : 'No refund decisions recorded yet.'
            }
          />
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            total={total}
            itemNoun="refund decision"
          />
        </>
      )}
    </div>
  )
}
