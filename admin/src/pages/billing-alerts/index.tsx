import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchBillingAlerts,
  patchBillingAlert,
  type BillingAlertRow,
  type BillingAlertStatusFilter,
} from '@features/billing-alerts/api'
import { ApiError } from '@shared/api/http-client'
import { Button } from '@shared/ui/button'
import { Card, CardContent } from '@shared/ui/card'
import { PageHeader } from '@shared/ui/page-header'
import { Pagination } from '@shared/ui/pagination'
import { QueryErrorPanel } from '@shared/ui/query-error-panel'
import { Select } from '@shared/ui/select'
import { Skeleton } from '@shared/ui/skeleton'
import { Textarea } from '@shared/ui/textarea'

const PAGE_SIZE = 25

const ALERTS_KEY = ['admin', 'billing-alerts'] as const
const OPEN_COUNT_KEY = ['admin', 'billing-alerts', 'open-count'] as const

/** Operator-facing explanation of what each alert type actually means for the customer. */
const ALERT_COPY: Record<string, { title: string; impact: string }> = {
  week1_conversion_failed: {
    title: '1-Week plan stuck on weekly billing',
    impact:
      'This subscription was never converted to the 4-week price. The customer keeps being charged the full weekly price every week — fix the subscription in Stripe, then resolve this alert.',
  },
}

/**
 * Queue of billing states that need a human to intervene in Stripe. Every row here
 * means money is currently moving incorrectly, so unresolved alerts are the default view.
 */
export function BillingAlertsPage() {
  const qc = useQueryClient()
  const [status, setStatus] = useState<BillingAlertStatusFilter>('open')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [...ALERTS_KEY, status, page, PAGE_SIZE],
    queryFn: () => fetchBillingAlerts({ status, page, limit: PAGE_SIZE }),
  })

  const resolve = useMutation({
    mutationFn: (args: { id: string; resolved: boolean; note?: string }) =>
      patchBillingAlert(args.id, { resolved: args.resolved, note: args.note }),
    onSuccess: (_res, args) => {
      qc.invalidateQueries({ queryKey: ALERTS_KEY })
      qc.invalidateQueries({ queryKey: OPEN_COUNT_KEY })
      toast.success(args.resolved ? 'Alert resolved' : 'Alert reopened')
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Could not update alert')
    },
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Revenue"
        title="Billing alerts"
        description="Subscriptions in a wrong billing state that need a manual fix in Stripe."
      />

      <Card className="border-border/70 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <div className="w-full sm:w-56">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="alert-status">
              Status
            </label>
            <Select
              id="alert-status"
              className="mt-1 h-10 w-full border-border/80 shadow-sm"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as BillingAlertStatusFilter)
                setPage(1)
              }}
            >
              <option value="open">Unresolved</option>
              <option value="resolved">Resolved</option>
              <option value="all">All</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          <span className="sr-only">Loading billing alerts…</span>
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : isError ? (
        <QueryErrorPanel error={error} what="billing alerts" onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyAlerts status={status} />
      ) : (
        <ul className="space-y-4">
          {items.map((a) => (
            <AlertCard
              key={a.id}
              alert={a}
              isPending={resolve.isPending}
              onResolve={(note) => resolve.mutate({ id: a.id, resolved: true, note })}
              onReopen={() => resolve.mutate({ id: a.id, resolved: false })}
            />
          ))}
        </ul>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        total={total}
        itemNoun="alert"
      />
    </div>
  )
}

/** Distinguishes "nothing is broken" from "nothing matches this filter". */
function EmptyAlerts({ status }: { status: BillingAlertStatusFilter }) {
  if (status === 'open') {
    return (
      <Card className="border-dashed border-emerald-500/30 bg-emerald-500/[0.04]">
        <CardContent className="flex gap-3 p-6">
          <CheckCircle2
            className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300"
            aria-hidden
          />
          <div>
            <p className="font-medium">No unresolved billing alerts</p>
            <p className="text-sm text-muted-foreground">
              Every known subscription is billing as advertised. Alerts appear here automatically
              when a checkout fails to convert to its intended price.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }
  return (
    <p className="text-sm text-muted-foreground">
      {status === 'resolved' ? 'No resolved alerts yet.' : 'No alerts recorded yet.'}
    </p>
  )
}

/** One alert with its Stripe identifiers and a resolve-with-note action. */
function AlertCard({
  alert,
  isPending,
  onResolve,
  onReopen,
}: {
  alert: BillingAlertRow
  isPending: boolean
  onResolve: (note?: string) => void
  onReopen: () => void
}) {
  const [note, setNote] = useState('')
  const [resolving, setResolving] = useState(false)
  const copy = ALERT_COPY[alert.alert_type]
  const isOpen = !alert.resolved_at

  return (
    <li
      className={
        isOpen
          ? 'rounded-xl border border-destructive/30 bg-destructive/[0.03] p-4 shadow-sm'
          : 'rounded-xl border border-border/70 bg-card p-4 shadow-sm'
      }
    >
      <div className="flex flex-wrap items-start gap-3">
        {isOpen ? (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
        ) : (
          <CheckCircle2
            className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300"
            aria-hidden
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{copy?.title ?? alert.alert_type}</p>
            <code className="rounded bg-muted/60 px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground">
              {alert.alert_type}
            </code>
            {!isOpen ? (
              <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-300">
                resolved
              </span>
            ) : null}
          </div>

          {copy?.impact ? (
            <p className="mt-1 text-sm leading-relaxed text-foreground/80">{copy.impact}</p>
          ) : null}

          {alert.detail ? (
            <p className="mt-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              {alert.detail}
            </p>
          ) : null}

          <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
            <IdRow label="Customer" value={alert.email} />
            <IdRow label="Raised" value={new Date(alert.created_at).toLocaleString()} />
            <IdRow label="Subscription" value={alert.stripe_subscription_id} mono stripeLink="subscriptions" />
            <IdRow label="Stripe customer" value={alert.stripe_customer_id} mono stripeLink="customers" />
          </dl>

          {alert.resolved_note ? (
            <p className="mt-3 rounded-md border border-emerald-500/25 bg-emerald-500/[0.06] px-3 py-2 text-xs leading-relaxed">
              <span className="font-semibold">Resolution note: </span>
              {alert.resolved_note}
            </p>
          ) : null}

          {isOpen ? (
            resolving ? (
              <div className="mt-3 space-y-2">
                <Textarea
                  className="min-h-[64px] border-border/80"
                  placeholder="What did you change in Stripe? (optional but recommended)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={isPending}
                    onClick={() => onResolve(note.trim() || undefined)}
                  >
                    Confirm resolved
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => {
                      setResolving(false)
                      setNote('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setResolving(true)}
              >
                Mark resolved…
              </Button>
            )
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              disabled={isPending}
              onClick={onReopen}
            >
              Reopen
            </Button>
          )}
        </div>
      </div>
    </li>
  )
}

/** One identifier row, optionally deep-linked into the Stripe dashboard. */
function IdRow({
  label,
  value,
  mono,
  stripeLink,
}: {
  label: string
  value: string | null
  mono?: boolean
  stripeLink?: 'subscriptions' | 'customers'
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? 'truncate font-mono text-[11px]' : 'truncate'}>
        {value ? (
          stripeLink ? (
            <a
              href={`https://dashboard.stripe.com/${stripeLink}/${value}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary underline underline-offset-2"
            >
              {value}
              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
            </a>
          ) : (
            value
          )
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </dd>
    </div>
  )
}
