import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import type { AdminBillingRow, AdminSubscriptionRow } from '@features/billing/api'
import {
  fetchAdminBillingHistory,
  fetchAdminSubscriptions,
} from '@features/billing/api'
import { downloadCsvFile, toCsv } from '@shared/lib/csv'
import { Button } from '@shared/ui/button'
import { PageHeader } from '@shared/ui/page-header'
import { Pagination } from '@shared/ui/pagination'
import { SearchToolbar } from '@shared/ui/search-toolbar'
import { Skeleton } from '@shared/ui/skeleton'
import { DataTable, type Column } from '@shared/ui/data-table'
import { cn } from '@shared/lib'

const PAGE_SIZE = 25

type Tab = 'subscriptions' | 'payments'

/**
 * Admin view of plan subscriptions and payment history: search, pagination, CSV export.
 */
export function BillingPage() {
  const [tab, setTab] = useState<Tab>('subscriptions')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const deferredSearch = useDeferredValue(search.trim())

  useEffect(() => {
    setPage(1)
  }, [deferredSearch, tab])

  const subsQuery = useQuery({
    queryKey: ['admin', 'subscriptions', deferredSearch, page, PAGE_SIZE],
    queryFn: () =>
      fetchAdminSubscriptions({
        search: deferredSearch || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    enabled: tab === 'subscriptions',
  })

  const billQuery = useQuery({
    queryKey: ['admin', 'billing-history', deferredSearch, page, PAGE_SIZE],
    queryFn: () =>
      fetchAdminBillingHistory({
        search: deferredSearch || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    enabled: tab === 'payments',
  })

  const isLoading = tab === 'subscriptions' ? subsQuery.isLoading : billQuery.isLoading
  const total =
    tab === 'subscriptions' ? (subsQuery.data?.total ?? 0) : (billQuery.data?.total ?? 0)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const subColumns: Column<AdminSubscriptionRow>[] = useMemo(
    () => [
      {
        key: 'user',
        header: 'Customer',
        render: (r) => (
          <div>
            <div className="font-medium">{r.name || '—'}</div>
            <div className="text-xs text-muted-foreground">{r.email}</div>
          </div>
        ),
      },
      {
        key: 'plan',
        header: 'Plan',
        render: (r) => <span className="font-medium">{r.plan_name}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        render: (r) => (
          <span
            className={cn(
              'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold',
              r.status === 'active'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                : r.status === 'paused'
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-800'
                  : 'border-border/80 text-muted-foreground'
            )}
          >
            {r.status}
          </span>
        ),
      },
      {
        key: 'price',
        header: 'Price',
        render: (r) => (
          <span className="tabular-nums">
            ${r.price.toFixed(2)}
            {r.intro_price != null ? (
              <span className="ml-1 text-xs text-muted-foreground">
                (intro ${r.intro_price.toFixed(2)})
              </span>
            ) : null}
          </span>
        ),
      },
      {
        key: 'discounts',
        header: 'Coupon / promo',
        render: (r) => {
          if (!r.coupon_label && !r.promo_code) {
            return <span className="text-muted-foreground">—</span>
          }
          return (
            <div className="text-sm">
              {r.coupon_label ? (
                <div className="font-medium">{r.coupon_label}</div>
              ) : null}
              {r.promo_code ? (
                <div className="text-xs text-muted-foreground">code: {r.promo_code}</div>
              ) : null}
            </div>
          )
        },
      },
      {
        key: 'renewal',
        header: 'Renewal',
        render: (r) => (
          <span className="text-muted-foreground">
            {r.renewal_date ? new Date(r.renewal_date).toLocaleDateString() : '—'}
          </span>
        ),
      },
      {
        key: 'since',
        header: 'Since',
        render: (r) => (
          <span className="text-muted-foreground">
            {new Date(r.created_at).toLocaleDateString()}
          </span>
        ),
      },
    ],
    []
  )

  const payColumns: Column<AdminBillingRow>[] = useMemo(
    () => [
      {
        key: 'user',
        header: 'Customer',
        render: (r) => (
          <div>
            <div className="font-medium">{r.name || '—'}</div>
            <div className="text-xs text-muted-foreground">{r.email}</div>
          </div>
        ),
      },
      {
        key: 'amount',
        header: 'Amount',
        render: (r) => (
          <div className="tabular-nums">
            <div className="font-medium">${r.amount.toFixed(2)}</div>
            {r.subtotal != null && r.discount_amount > 0 ? (
              <div className="text-xs text-muted-foreground">
                was ${r.subtotal.toFixed(2)} (−${r.discount_amount.toFixed(2)})
              </div>
            ) : null}
          </div>
        ),
      },
      {
        key: 'discounts',
        header: 'Coupon / promo',
        render: (r) => {
          if (!r.coupon_label && !r.promo_code) {
            return <span className="text-muted-foreground">—</span>
          }
          return (
            <div className="text-sm">
              {r.coupon_label ? (
                <div className="font-medium">{r.coupon_label}</div>
              ) : null}
              {r.promo_code ? (
                <div className="text-xs text-muted-foreground">code: {r.promo_code}</div>
              ) : null}
            </div>
          )
        },
      },
      {
        key: 'description',
        header: 'Description',
        render: (r) => <span className="max-w-md truncate text-sm">{r.description}</span>,
      },
      {
        key: 'paid',
        header: 'Paid at',
        render: (r) => (
          <span className="text-muted-foreground">
            {new Date(r.paid_at).toLocaleString()}
          </span>
        ),
      },
    ],
    []
  )

  /**
   * Exports the current filter to CSV (capped at 500 rows) for the active tab.
   */
  async function exportCsv() {
    if (tab === 'subscriptions') {
      const chunk = await fetchAdminSubscriptions({
        search: deferredSearch || undefined,
        page: 1,
        limit: 500,
      })
      const csv = toCsv(
        [
          'id',
          'user_id',
          'email',
          'name',
          'plan_name',
          'status',
          'intro_price',
          'price',
          'coupon_label',
          'promo_code',
          'renewal_date',
          'paused_at',
          'created_at',
        ],
        chunk.items,
        (r) => [
          r.id,
          r.user_id,
          r.email,
          r.name ?? '',
          r.plan_name,
          r.status,
          r.intro_price != null ? String(r.intro_price) : '',
          r.price,
          r.coupon_label ?? '',
          r.promo_code ?? '',
          r.renewal_date,
          r.paused_at ?? '',
          r.created_at,
        ]
      )
      downloadCsvFile(csv, 'appex-subscriptions.csv')
    } else {
      const chunk = await fetchAdminBillingHistory({
        search: deferredSearch || undefined,
        page: 1,
        limit: 500,
      })
      const csv = toCsv(
        [
          'id',
          'user_id',
          'email',
          'name',
          'amount',
          'subtotal',
          'discount_amount',
          'coupon_label',
          'promo_code',
          'description',
          'paid_at',
          'created_at',
        ],
        chunk.items,
        (r) => [
          r.id,
          r.user_id,
          r.email,
          r.name ?? '',
          r.amount,
          r.subtotal != null ? String(r.subtotal) : '',
          r.discount_amount,
          r.coupon_label ?? '',
          r.promo_code ?? '',
          r.description,
          r.paid_at,
          r.created_at,
        ]
      )
      downloadCsvFile(csv, 'appex-billing-history.csv')
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Revenue"
        title="Billing"
        description="Plans tied to users and payment history from billing_history."
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={tab === 'subscriptions' ? 'default' : 'outline'}
          onClick={() => setTab('subscriptions')}
        >
          Subscriptions
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === 'payments' ? 'default' : 'outline'}
          onClick={() => setTab('payments')}
        >
          Payment history
        </Button>
      </div>

      <SearchToolbar
        value={search}
        onChange={setSearch}
        label="Search billing"
        placeholder={
          tab === 'subscriptions'
            ? 'Search plan, coupon, promo, user email, name, or user id…'
            : 'Search description, coupon, promo, user email, name, or user id…'
        }
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
      ) : tab === 'subscriptions' ? (
        <>
          <DataTable
            rows={subsQuery.data?.items ?? []}
            columns={subColumns}
            getRowKey={(r) => r.id}
          />
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            total={total}
            itemNoun="subscription"
          />
        </>
      ) : (
        <>
          <DataTable
            rows={billQuery.data?.items ?? []}
            columns={payColumns}
            getRowKey={(r) => r.id}
          />
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            total={total}
            itemNoun="payment"
          />
        </>
      )}
    </div>
  )
}
