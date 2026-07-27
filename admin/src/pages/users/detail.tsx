import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Award,
  BookOpen,
  CreditCard,
  ExternalLink,
  Flame,
  Mail,
  MessageSquare,
  Undo2,
} from 'lucide-react'
import { fetchAdminUserDetail, type AdminUserDetail } from '@features/users/detail-api'
import { RefundDialog } from '@features/refunds/refund-dialog'
import { Button } from '@shared/ui/button'
import { Card, CardContent } from '@shared/ui/card'
import { PageHeader } from '@shared/ui/page-header'
import { QueryErrorPanel } from '@shared/ui/query-error-panel'
import { Skeleton } from '@shared/ui/skeleton'
import { cn } from '@shared/lib'

type Tab = 'overview' | 'billing' | 'learning' | 'comms'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'billing', label: 'Billing' },
  { id: 'learning', label: 'Learning' },
  { id: 'comms', label: 'Comms' },
]

/**
 * Single-user 360° view. Everything here already existed in the database but was
 * only reachable by pasting an email into three different list pages.
 */
export function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<Tab>('overview')
  const [refundOpen, setRefundOpen] = useState(false)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'user-detail', id],
    queryFn: () => fetchAdminUserDetail(String(id)),
    enabled: Boolean(id),
  })

  if (isLoading) {
    return (
      <div className="space-y-8" aria-busy="true">
        <span className="sr-only">Loading user…</span>
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <BackLink />
        <QueryErrorPanel error={error} what="user" onRetry={() => refetch()} />
      </div>
    )
  }

  if (!data) return null

  const u = data.user

  return (
    <div className="space-y-8">
      <BackLink />

      <PageHeader
        badge="People"
        title={u.name || u.email}
        description={
          u.name ? `${u.email} · joined ${new Date(u.created_at).toLocaleDateString()}` : `Joined ${new Date(u.created_at).toLocaleDateString()}`
        }
        actions={
          <Button type="button" variant="outline" className="gap-2" onClick={() => setRefundOpen(true)}>
            <Undo2 className="h-4 w-4" />
            Review refund
          </Button>
        }
      />

      <IdentityStrip detail={data} />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="User detail sections">
        {TABS.map((t) => (
          <Button
            key={t.id}
            type="button"
            size="sm"
            role="tab"
            aria-selected={tab === t.id}
            variant={tab === t.id ? 'default' : 'outline'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === 'overview' ? <OverviewTab detail={data} /> : null}
      {tab === 'billing' ? <BillingTab detail={data} /> : null}
      {tab === 'learning' ? <LearningTab detail={data} /> : null}
      {tab === 'comms' ? <CommsTab detail={data} /> : null}

      {refundOpen ? (
        <RefundDialog
          open
          onOpenChange={setRefundOpen}
          userId={u.id}
          userEmail={u.email}
        />
      ) : null}
    </div>
  )
}

function BackLink() {
  return (
    <Link
      to="/users"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      All users
    </Link>
  )
}

/** Role, region, and refund-eligibility flags that change how support should treat this account. */
function IdentityStrip({ detail }: { detail: AdminUserDetail }) {
  const { user, engagement } = detail
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        icon={Flame}
        label="Streak"
        value={`${engagement.streak_current} day${engagement.streak_current === 1 ? '' : 's'}`}
        hint={`Best ${engagement.streak_best} · ${engagement.active_days.length} active days logged`}
      />
      <StatTile
        icon={BookOpen}
        label="Lessons opened"
        value={String(engagement.lessons_opened_total)}
        hint={`${detail.lessons.filter((l) => l.completed).length} completed`}
      />
      <StatTile icon={CreditCard} label="Credits" value={String(engagement.credits)} />
      <StatTile
        icon={Award}
        label="Certificates"
        value={String(detail.certificates.length)}
        hint={user.country_code ? `Region ${user.country_code}` : undefined}
      />
      <div className="sm:col-span-2 xl:col-span-4">
        <div className="flex flex-wrap gap-2">
          <Flag active={user.role === 'admin'} label="admin" tone="brand" />
          <Flag active={user.is_eu_resident} label="EU resident (14-day refund)" tone="warning" />
          <Flag active={user.courtesy_refund_used} label="courtesy refund used" tone="warning" />
          {user.country_code ? <Flag active label={user.country_code} tone="neutral" /> : null}
        </div>
      </div>
    </div>
  )
}

function Flag({
  active,
  label,
  tone,
}: {
  active: boolean
  label: string
  tone: 'brand' | 'warning' | 'neutral'
}) {
  if (!active) return null
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        tone === 'brand' && 'border-primary/20 bg-primary/10 text-primary',
        tone === 'warning' &&
          'border-amber-300/70 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100',
        tone === 'neutral' && 'border-border/70 bg-muted/40 text-foreground/90'
      )}
    >
      {label}
    </span>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Flame
  label: string
  value: string
  hint?: string
}) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold tabular-nums leading-tight">{value}</p>
          {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string
  count?: number
  empty?: string
  children?: React.ReactNode
}) {
  const isEmpty = count === 0
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-2.5">
          <p className="text-sm font-semibold">{title}</p>
          {count != null ? (
            <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
          ) : null}
        </div>
        {isEmpty ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">{empty ?? 'Nothing here yet.'}</p>
        ) : (
          <div className="divide-y divide-border/50">{children}</div>
        )}
      </CardContent>
    </Card>
  )
}

/** One key/value row used across the detail sections. */
function Row({
  primary,
  secondary,
  trailing,
}: {
  primary: React.ReactNode
  secondary?: React.ReactNode
  trailing?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="text-sm">{primary}</div>
        {secondary ? <div className="text-xs text-muted-foreground">{secondary}</div> : null}
      </div>
      {trailing ? <div className="shrink-0 text-xs text-muted-foreground">{trailing}</div> : null}
    </div>
  )
}

function OverviewTab({ detail }: { detail: AdminUserDetail }) {
  const s = detail.subscription
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Section title="Subscription" count={s ? 1 : 0} empty="No subscription on file.">
        {s ? (
          <>
            <Row
              primary={
                <span className="font-medium">
                  {s.plan_name}{' '}
                  <span className="font-normal text-muted-foreground">({s.status})</span>
                </span>
              }
              secondary={`$${s.price.toFixed(2)}${s.billing_interval ? ` / ${s.billing_interval}` : ''}${
                s.intro_price != null ? ` · intro $${s.intro_price.toFixed(2)}` : ''
              }`}
              trailing={s.cancel_at_period_end ? 'cancels at period end' : undefined}
            />
            <Row primary="Renewal" secondary={new Date(s.renewal_date).toLocaleDateString()} />
            {s.trial_end ? (
              <Row primary="Trial ends" secondary={new Date(s.trial_end).toLocaleString()} />
            ) : null}
            {s.current_period_end ? (
              <Row
                primary="Current period ends"
                secondary={new Date(s.current_period_end).toLocaleString()}
              />
            ) : null}
            {s.stripe_subscription_id ? (
              <Row
                primary="Stripe subscription"
                secondary={
                  <a
                    href={`https://dashboard.stripe.com/subscriptions/${s.stripe_subscription_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-primary underline underline-offset-2"
                  >
                    {s.stripe_subscription_id}
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                }
              />
            ) : null}
          </>
        ) : null}
      </Section>

      <Section
        title="Course progress"
        count={detail.courses.length}
        empty="Has not started any course."
      >
        {detail.courses.map((c) => (
          <Row
            key={c.skill_id}
            primary={
              <Link to={`/courses/${c.skill_id}`} className="font-medium hover:underline">
                {c.title}
              </Link>
            }
            secondary={`${c.progress}% · ${c.status.replace('_', ' ')}`}
            trailing={new Date(c.updated_at).toLocaleDateString()}
          />
        ))}
      </Section>
    </div>
  )
}

function BillingTab({ detail }: { detail: AdminUserDetail }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Section title="Payments" count={detail.payments.length} empty="No payments recorded.">
        {detail.payments.map((p) => (
          <Row
            key={p.id}
            primary={<span className="font-medium tabular-nums">${p.amount.toFixed(2)}</span>}
            secondary={
              <>
                {p.description}
                {p.discount_amount > 0 && p.subtotal != null
                  ? ` · was $${p.subtotal.toFixed(2)} (−$${p.discount_amount.toFixed(2)})`
                  : ''}
                {p.promo_code ? ` · code ${p.promo_code}` : ''}
              </>
            }
            trailing={new Date(p.paid_at).toLocaleDateString()}
          />
        ))}
      </Section>

      <Section title="Refund decisions" count={detail.refunds.length} empty="No refund history.">
        {detail.refunds.map((r) => (
          <Row
            key={r.id}
            primary={
              <span
                className={
                  r.decision === 'approved'
                    ? 'font-medium text-emerald-700 dark:text-emerald-300'
                    : 'font-medium text-amber-800 dark:text-amber-200'
                }
              >
                {r.decision}
              </span>
            }
            secondary={
              <>
                <code className="text-[11px]">{r.reason_code}</code>
                {r.stripe_refund_id ? ` · ${r.stripe_refund_id}` : ' · not issued in Stripe'}
                {r.courtesy_applied ? ' · courtesy' : ''}
              </>
            }
            trailing={new Date(r.created_at).toLocaleDateString()}
          />
        ))}
      </Section>
    </div>
  )
}

function LearningTab({ detail }: { detail: AdminUserDetail }) {
  const rated = detail.lessons.filter((l) => l.rating != null || l.feedback)
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Lesson activity" count={detail.lessons.length} empty="No lesson activity.">
          {detail.lessons.map((l) => (
            <Row
              key={l.lesson_id}
              primary={
                <span>
                  {l.title}
                  {l.label ? <span className="text-muted-foreground"> ({l.label})</span> : null}
                </span>
              }
              secondary={
                l.completed
                  ? `Completed${l.completed_at ? ` ${new Date(l.completed_at).toLocaleDateString()}` : ''}`
                  : `In progress · step ${l.step_index + 1}`
              }
              trailing={l.rating != null ? `★ ${l.rating}/5` : undefined}
            />
          ))}
        </Section>

        <Section
          title="Submissions"
          count={detail.submissions.length}
          empty="No homework submitted."
        >
          {detail.submissions.map((s) => (
            <Row
              key={s.id}
              primary={s.lesson_title}
              secondary={
                <>
                  {s.status}
                  {s.grade ? ` · grade ${s.grade}` : ''}
                </>
              }
              trailing={new Date(s.created_at).toLocaleDateString()}
            />
          ))}
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          title="Lesson feedback given"
          count={rated.length}
          empty="Has not rated any lesson."
        >
          {rated.map((l) => (
            <Row
              key={`fb-${l.lesson_id}`}
              primary={
                <span>
                  {l.title}
                  {l.rating != null ? (
                    <span className="ml-2 font-medium">★ {l.rating}/5</span>
                  ) : null}
                </span>
              }
              secondary={l.feedback ?? undefined}
            />
          ))}
        </Section>

        <Section
          title="Quiz attempts"
          count={detail.quiz_attempts.length}
          empty="No quiz attempts."
        >
          {detail.quiz_attempts.map((q) => (
            <Row
              key={q.id}
              primary={
                <span>
                  {q.lesson_title}{' '}
                  <span className="text-xs text-muted-foreground">
                    step {q.step_index + 1}/block {q.block_index + 1}
                  </span>
                </span>
              }
              secondary={
                q.open_response
                  ? q.open_response
                  : q.is_correct == null
                    ? 'no verdict'
                    : q.is_correct
                      ? 'correct'
                      : 'incorrect'
              }
              trailing={new Date(q.created_at).toLocaleDateString()}
            />
          ))}
        </Section>
      </div>

      <Section
        title="Certificates"
        count={detail.certificates.length}
        empty="No certificates issued."
      >
        {detail.certificates.map((c) => (
          <Row
            key={c.id}
            primary={c.course_title}
            secondary={<code className="text-[11px]">{c.cert_code}</code>}
            trailing={new Date(c.issued_at).toLocaleDateString()}
          />
        ))}
      </Section>
    </div>
  )
}

function CommsTab({ detail }: { detail: AdminUserDetail }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Section
        title="Support messages"
        count={detail.support_messages.length}
        empty="Has not contacted support."
      >
        {detail.support_messages.map((m) => (
          <Row
            key={m.id}
            primary={
              <span className="inline-flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                {m.subject}
              </span>
            }
            secondary={`${m.category}${m.read_at ? '' : ' · unread'}`}
            trailing={new Date(m.created_at).toLocaleDateString()}
          />
        ))}
      </Section>

      <Section
        title="Lifecycle emails sent"
        count={detail.emails.length}
        empty="No lifecycle emails logged."
      >
        {detail.emails.map((e) => (
          <Row
            key={e.id}
            primary={
              <span className="inline-flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                {e.email_type}
              </span>
            }
            secondary={e.mailgun_id ? <code className="text-[11px]">{e.mailgun_id}</code> : 'no mailgun id'}
            trailing={new Date(e.sent_at).toLocaleDateString()}
          />
        ))}
      </Section>
    </div>
  )
}
