import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  evaluateRefund,
  processRefund,
  type RefundEvaluation,
  type RefundReasonCode,
} from './api'
import { ApiError } from '@shared/api/http-client'
import { Button } from '@shared/ui/button'
import { Checkbox } from '@shared/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/ui/dialog'
import { QueryErrorPanel } from '@shared/ui/query-error-panel'
import { Skeleton } from '@shared/ui/skeleton'

/** Operator-facing explanation for each policy verdict code. */
const REASON_LABELS: Record<RefundReasonCode, string> = {
  standard_7_day_no_engagement: 'Within the 7-day window with no lessons opened',
  eu_14_day_no_completion: 'EU consumer 14-day window, no lessons completed',
  courtesy_renewal_no_completion: 'One-time courtesy refund on a renewal charge',
  period_expired: 'Billing period already ended',
  outside_refund_window: 'Outside the refund window',
  lessons_completed: 'Learner completed lessons — content was consumed',
  lessons_opened: 'Learner opened lessons — content was accessed',
  courtesy_already_used: 'Courtesy refund was already used on this account',
  not_renewal_charge: 'Not a renewal charge, so courtesy policy does not apply',
  billing_record_not_found: 'No matching payment found for this user',
}

interface RefundDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userEmail: string
  /** Specific payment to refund; omitted means the service picks the latest. */
  billingHistoryId?: string
}

/**
 * Two-step admin refund flow: run the policy engine first (no side effects),
 * show the verdict with the evidence behind it, then require an explicit
 * confirmation before anything is committed. Executing a real Stripe refund is
 * an opt-in checkbox, kept off by default so the safe action is the default one.
 */
export function RefundDialog({
  open,
  onOpenChange,
  userId,
  userEmail,
  billingHistoryId,
}: RefundDialogProps) {
  const qc = useQueryClient()
  const [executeStripe, setExecuteStripe] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const evaluation = useQuery({
    queryKey: ['admin', 'refund-evaluate', userId, billingHistoryId ?? null],
    queryFn: () => evaluateRefund(userId, billingHistoryId),
    enabled: open,
    // A verdict depends on lessons opened/completed at this instant — never serve a stale one.
    staleTime: 0,
    gcTime: 0,
  })

  const process = useMutation({
    mutationFn: () => processRefund({ userId, billingHistoryId, executeStripeRefund: executeStripe }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['admin', 'refunds'] })
      qc.invalidateQueries({ queryKey: ['admin', 'billing-history'] })
      qc.invalidateQueries({ queryKey: ['admin', 'subscriptions'] })
      if (result.stripeRefundId) {
        toast.success(`Stripe refund issued (${result.stripeRefundId})`)
      } else if (result.decision === 'approved') {
        toast.success('Refund recorded (no Stripe refund issued)')
      } else {
        toast.info(`Decision recorded: ${result.decision}`)
      }
      handleClose()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Refund failed')
    },
  })

  /** Resets local step state so a reopened dialog never inherits a prior confirmation. */
  function handleClose() {
    setConfirming(false)
    setExecuteStripe(false)
    onOpenChange(false)
  }

  const data = evaluation.data

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : handleClose())}>
      <DialogContent className="flex max-h-[calc(100vh-2rem)] w-[calc(100vw-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden border-border/80 p-0">
        <DialogHeader className="border-b border-border/60 bg-muted/30 px-6 py-5 text-left">
          <DialogTitle>Refund review</DialogTitle>
          <DialogDescription>
            Policy check for <span className="font-medium text-foreground">{userEmail}</span>. Nothing
            is charged back until you confirm below.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {evaluation.isLoading ? (
            <div className="space-y-3" aria-busy="true">
              <span className="sr-only">Running refund policy check…</span>
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : evaluation.isError ? (
            <QueryErrorPanel
              error={evaluation.error}
              what="refund eligibility"
              onRetry={() => evaluation.refetch()}
            />
          ) : data ? (
            <>
              <VerdictBanner evaluation={data} />
              <EvidenceGrid evaluation={data} />

              {data.decision === 'approved' ? (
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <Checkbox
                    className="mt-0.5"
                    checked={executeStripe}
                    onChange={(e) => {
                      setExecuteStripe(e.target.checked)
                      setConfirming(false)
                    }}
                  />
                  <span>
                    <span className="block font-medium text-destructive">
                      Issue a real Stripe refund
                    </span>
                    <span className="block text-xs leading-relaxed text-muted-foreground">
                      Moves money back to the customer. Leave unchecked to only record the decision
                      (for refunds handled manually or outside Stripe).
                    </span>
                  </span>
                </label>
              ) : (
                <p className="rounded-lg border border-border/70 bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
                  Policy denies this refund. Confirming records the denial in the audit trail — no
                  money moves. Use this to document what support was asked for and declined.
                </p>
              )}

              {confirming ? (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm"
                >
                  <p className="font-semibold text-destructive">
                    {executeStripe
                      ? `Refund ${data.amount != null ? `$${data.amount.toFixed(2)}` : 'this payment'} to ${userEmail}?`
                      : `Record a ${data.decision} decision for ${userEmail}?`}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {executeStripe
                      ? 'This calls Stripe immediately. The action is logged and cannot be undone from here.'
                      : 'This writes an audit row. No charge is reversed.'}
                  </p>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 border-t border-border/60 bg-muted/20 px-6 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={process.isPending}
            onClick={handleClose}
          >
            Cancel
          </Button>
          {data ? (
            confirming ? (
              <Button
                type="button"
                variant={executeStripe ? 'destructive' : 'default'}
                className="w-full sm:w-auto sm:min-w-40"
                disabled={process.isPending}
                onClick={() => process.mutate()}
              >
                {process.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing…
                  </>
                ) : executeStripe ? (
                  'Yes, refund in Stripe'
                ) : (
                  'Yes, record decision'
                )}
              </Button>
            ) : (
              <Button
                type="button"
                variant={executeStripe ? 'destructive' : 'default'}
                className="w-full sm:w-auto sm:min-w-40"
                onClick={() => setConfirming(true)}
              >
                {executeStripe ? 'Refund in Stripe…' : 'Record decision…'}
              </Button>
            )
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Approved/denied headline with the policy reason behind it. */
function VerdictBanner({ evaluation }: { evaluation: RefundEvaluation }) {
  const approved = evaluation.decision === 'approved'
  return (
    <div
      className={
        approved
          ? 'flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4'
          : 'flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4'
      }
    >
      {approved ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden />
      ) : (
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-800 dark:text-amber-200" aria-hidden />
      )}
      <div className="min-w-0">
        <p
          className={
            approved
              ? 'font-semibold text-emerald-800 dark:text-emerald-200'
              : 'font-semibold text-amber-900 dark:text-amber-100'
          }
        >
          Policy says: {approved ? 'refund approved' : 'refund denied'}
        </p>
        <p className="mt-0.5 text-sm leading-relaxed text-foreground/80">
          {REASON_LABELS[evaluation.reasonCode] ?? evaluation.reasonCode}
        </p>
        {evaluation.reasonDetail ? (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {evaluation.reasonDetail}
          </p>
        ) : null}
      </div>
    </div>
  )
}

/** The facts the verdict was computed from, so an operator can sanity-check it. */
function EvidenceGrid({ evaluation }: { evaluation: RefundEvaluation }) {
  const rows: Array<{ label: string; value: string; warn?: boolean }> = [
    {
      label: 'Payment',
      value:
        evaluation.amount != null
          ? `$${evaluation.amount.toFixed(2)}${
              evaluation.purchasePaidAt
                ? ` on ${new Date(evaluation.purchasePaidAt).toLocaleDateString()}`
                : ''
            }`
          : '—',
    },
    { label: 'Days since purchase', value: String(evaluation.daysSincePurchase) },
    {
      label: 'Lessons opened',
      value: String(evaluation.lessonsOpened),
      warn: evaluation.lessonsOpened > 0,
    },
    {
      label: 'Lessons completed',
      value: String(evaluation.lessonsCompleted),
      warn: evaluation.lessonsCompleted > 0,
    },
    { label: 'Renewal charge', value: evaluation.isRenewalCharge ? 'Yes' : 'No' },
    { label: 'Period expired', value: evaluation.subscriptionPeriodExpired ? 'Yes' : 'No' },
    {
      label: 'Courtesy already used',
      value: evaluation.courtesyRefundUsed ? 'Yes' : 'No',
      warn: evaluation.courtesyRefundUsed,
    },
    { label: 'EU resident', value: evaluation.isEuResident ? 'Yes' : 'No' },
  ]

  return (
    <div className="rounded-xl border border-border/70">
      <p className="border-b border-border/60 bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Evidence
      </p>
      <dl className="grid gap-x-6 gap-y-2 px-4 py-3 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-3 text-sm">
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd
              className={
                r.warn
                  ? 'flex items-center gap-1 font-medium text-amber-800 dark:text-amber-200'
                  : 'font-medium'
              }
            >
              {r.warn ? <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> : null}
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
