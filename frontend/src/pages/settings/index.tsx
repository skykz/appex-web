import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import {
  BadgeCheck,
  Lock,
  Receipt,
  CreditCard,
  HelpCircle,
  Eye,
  EyeOff,
  LogOut,
  ChevronRight,
  Download,
  RefreshCw,
  Hourglass,
  ExternalLink,
  X,
  Sparkles,
} from 'lucide-react'
import { cn } from '@shared/lib'
import {
  subscriptionGrantsAccess,
  isInPaymentGracePeriod,
  isPaymentGraceExpired,
  formatGraceTimeRemaining,
} from '@shared/lib'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@shared/ui'
import { useAuthStore, userApi } from '@entities/user'
import { settingsApi, type BillingInterval, type Subscription, type BillingRecord, type Plan } from './api'

type Section = 'account' | 'password' | 'billing' | 'plan' | 'contact'

const navItems: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'account', label: 'Account', icon: BadgeCheck },
  { id: 'password', label: 'Password', icon: Lock },
  { id: 'billing', label: 'Billing history', icon: Receipt },
  { id: 'plan', label: 'Subscription', icon: CreditCard },
  { id: 'contact', label: 'Contact us', icon: HelpCircle },
]

/**
 * Accepts only known settings section ids from the URL; unknown values fall back to account.
 */
function sectionFromParam(value: string | null): Section {
  return navItems.some((item) => item.id === value) ? (value as Section) : 'account'
}

/** Short plan title for the plan picker cards. */
function planCardTitle(id: BillingInterval): string {
  switch (id) {
    case 'week_1':
      return '1-week plan'
    case 'week_4':
      return '4-week plan'
    case 'year':
      return 'Yearly plan'
  }
}

/** Renewal cadence label on the active subscription view. */
function billingPeriodLabel(interval: BillingInterval | null): string {
  switch (interval) {
    case 'year':
      return 'year'
    case 'week_1':
      return 'week'
    case 'week_4':
      return '4 weeks'
    default:
      return '4 weeks'
  }
}

/** Annualized plan cost for comparing shorter billing intervals to yearly in the cancel modal. */
function annualPlanCost(amount: number, interval: BillingInterval): number {
  switch (interval) {
    case 'week_1':
      return amount * 52
    case 'week_4':
      return amount * 13
    case 'year':
      return amount
  }
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const section = sectionFromParam(searchParams.get('section'))
  const checkout = searchParams.get('checkout')
  const queryClient = useQueryClient()

  // Stripe redirects back here with ?checkout=success&session_id=cs_... after
  // a finished Checkout. The webhook usually lands first, but to eliminate the
  // race entirely we synchronously pull the session into our DB *before*
  // invalidating queries. If the webhook already did the job, the upsert is a
  // no-op rewrite.
  useEffect(() => {
    if (checkout !== 'success') return
    const sessionId = searchParams.get('session_id')
    // Ensure we're on the Plan section so the success state is visible.
    if (searchParams.get('section') !== 'plan') {
      const next = new URLSearchParams(searchParams)
      next.set('section', 'plan')
      setSearchParams(next, { replace: true })
    }
    let cancelled = false
    ;(async () => {
      if (sessionId) {
        try {
          await settingsApi.syncFromSession(sessionId)
        } catch {
          // Even if sync fails (e.g. 503 stripe down), still invalidate —
          // the webhook may have already written the row.
        }
      }
      if (cancelled) return
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
      queryClient.invalidateQueries({ queryKey: ['billing-history'] })
    })()
    return () => {
      cancelled = true
    }
  }, [checkout, queryClient, searchParams, setSearchParams])

  /**
   * Keeps settings navigation linkable so account-menu shortcuts can open the correct section.
   * Also clears any checkout=success|cancel residue when the user navigates away.
   */
  function selectSection(next: Section) {
    const params = new URLSearchParams(searchParams)
    params.set('section', next)
    params.delete('checkout')
    params.delete('session_id')
    setSearchParams(params, { replace: true })
  }

  function dismissBanner() {
    const next = new URLSearchParams(searchParams)
    next.delete('checkout')
    next.delete('session_id')
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="relative min-h-dvh w-full py-2">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and subscription settings.
        </p>

        {checkout === 'success' && (
          <CheckoutBanner
            kind="success"
            onDismiss={dismissBanner}
            onStartLearning={() => navigate('/home', { replace: true })}
          />
        )}
        {checkout === 'cancel' && (
          <CheckoutBanner kind="cancel" onDismiss={dismissBanner} />
        )}

        <div className="mt-6 flex flex-col gap-8 lg:flex-row">
          <nav className="w-full shrink-0 lg:w-56">
            <div className="scrollbar-hide -mx-4 flex flex-row gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0 lg:flex-col">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectSection(item.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
                    section === item.id
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  )}
                >
                  <item.icon className="size-4 shrink-0" aria-hidden />
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              ))}
            </div>
          </nav>

          <div className="min-w-0 flex-1">
            {section === 'account' && <AccountSection />}
            {section === 'password' && <PasswordSection />}
            {section === 'billing' && <BillingSection />}
            {section === 'plan' && <PlanSection />}
            {section === 'contact' && <ContactSection />}
          </div>
        </div>
      </div>
    </div>
  )
}

function CheckoutBanner({
  kind,
  onDismiss,
  onStartLearning,
}: {
  kind: 'success' | 'cancel'
  onDismiss: () => void
  onStartLearning?: () => void
}) {
  const isSuccess = kind === 'success'
  return (
    <div
      className={cn(
        'mt-4 flex items-start gap-3 rounded-xl border p-3 text-sm',
        isSuccess
          ? 'border-green-200 bg-green-50 text-green-900 dark:border-green-900/40 dark:bg-green-950/40 dark:text-green-100'
          : 'border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-900/40 dark:bg-yellow-950/40 dark:text-yellow-100'
      )}
    >
      <Sparkles className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1 space-y-2">
        {isSuccess ? (
          <>
            <p>
              Welcome to AppEx Premium — your subscription is now active. Your
              first invoice will appear below shortly.
            </p>
            {onStartLearning && (
              <Button type="button" size="sm" onClick={onStartLearning}>
                Start learning
              </Button>
            )}
          </>
        ) : (
          <p>Checkout cancelled. You haven't been charged.</p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded p-0.5 opacity-70 hover:opacity-100"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

/* ── Account ── */
function AccountSection() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const setUser = useAuthStore((s) => s.setUser)
  const nameRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  async function handleSave() {
    const name = nameRef.current?.value.trim()
    if (!name) return
    setSaving(true)
    setStatus('idle')
    try {
      const updated = await userApi.updateProfile({ name })
      setUser(updated)
      setStatus('saved')
    } catch {
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Account</h2>
        <p className="text-sm text-muted-foreground">
          Update your name and email address.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="settings-name" className="text-sm font-medium">Full name</label>
          <input
            id="settings-name"
            ref={nameRef}
            type="text"
            defaultValue={user?.name ?? ''}
            onChange={() => setStatus('idle')}
            className="w-full rounded-lg border bg-muted/30 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-ring sm:text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="settings-email" className="text-sm font-medium">Email</label>
          <input
            id="settings-email"
            type="email"
            defaultValue={user?.email ?? ''}
            disabled
            className="w-full rounded-lg border bg-muted/30 px-3 py-2.5 text-base outline-none opacity-60 sm:text-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleSave} disabled={saving} size="xl">
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
          {status === 'saved' && (
            <span className="text-sm font-medium text-emerald-600">
              Changes saved
            </span>
          )}
          {status === 'error' && (
            <span className="text-sm font-medium text-destructive">
              Couldn't save — please try again
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border p-4">
        <div>
          <p className="text-sm font-semibold">Session</p>
          <p className="text-sm text-muted-foreground">
            Log-out from your account on this device
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            logout()
            navigate('/auth')
          }}
        >
          Sign out
          <LogOut className="size-4" />
        </Button>
      </div>

      <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 p-4 dark:border-amber-900/40 dark:bg-amber-950/30">
        <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
          Deleting your account does not cancel your subscription
        </p>
        <p className="mt-1 text-sm leading-relaxed text-amber-900/90 dark:text-amber-100/90">
          If you want to stop future charges, cancel your subscription under{' '}
          <button
            type="button"
            onClick={() => navigate('/settings?section=plan')}
            className="font-medium underline underline-offset-2 hover:text-foreground"
          >
            Subscription management
          </button>{' '}
          before removing your account. Contact{' '}
          <a href="mailto:support@appex.me" className="font-medium underline underline-offset-2">
            support@appex.me
          </a>{' '}
          if you need help.
        </p>
      </div>
    </div>
  )
}

/* ── Password ── */
function PasswordSection() {
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const currentRef = useRef<HTMLInputElement>(null)
  const newRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)

  async function handleSave() {
    setError('')
    setSuccess(false)
    const currentPassword = currentRef.current?.value ?? ''
    const newPassword = newRef.current?.value ?? ''
    const confirmPassword = confirmRef.current?.value ?? ''

    if (!currentPassword || !newPassword) {
      setError('Please fill in all fields')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }

    setSaving(true)
    try {
      await userApi.changePassword({ currentPassword, newPassword })
      setSuccess(true)
      if (currentRef.current) currentRef.current.value = ''
      if (newRef.current) newRef.current.value = ''
      if (confirmRef.current) confirmRef.current.value = ''
    } catch {
      setError('Failed to change password. Check your current password.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Password</h2>
        <p className="text-sm text-muted-foreground">
          Ensure your account is using a long, random password to stay secure
        </p>
      </div>

      <div className="space-y-4">
        <PasswordField
          label="Current password"
          placeholder="Enter password"
          visible={showCurrent}
          onToggle={() => setShowCurrent(!showCurrent)}
          inputRef={currentRef}
        />
        <PasswordField
          label="New password"
          placeholder="Enter new password"
          visible={showNew}
          onToggle={() => setShowNew(!showNew)}
          inputRef={newRef}
        />
        <PasswordField
          label="Confirm password"
          placeholder="Repeat new password"
          visible={showConfirm}
          onToggle={() => setShowConfirm(!showConfirm)}
          inputRef={confirmRef}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-emerald-600">Password updated successfully</p>}
        <Button
          onClick={handleSave}
          disabled={saving}
          size="xl"
        >
          {saving ? 'Saving...' : 'Save password'}
        </Button>
      </div>
    </div>
  )
}

function PasswordField({
  label,
  placeholder,
  visible,
  onToggle,
  inputRef,
}: {
  label: string
  placeholder: string
  visible: boolean
  onToggle: () => void
  inputRef: React.RefObject<HTMLInputElement | null>
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          className="w-full rounded-lg border bg-muted/30 px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  )
}

/* ── Billing history ── */
function formatMoney(amount: number, currency: string | null): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (currency ?? 'usd').toUpperCase(),
    }).format(amount)
  } catch {
    return `$${amount.toFixed(2)}`
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    })
  } catch {
    return iso.slice(0, 10)
  }
}

function BillingSection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['billing-history'],
    queryFn: () => settingsApi.getBillingHistory(),
  })

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Billing history</h2>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}
      {isError && (
        <p className="text-sm text-destructive">Couldn't load billing history.</p>
      )}
      {!isLoading && !isError && (!data || data.length === 0) && (
        <div className="rounded-xl border p-6 text-center">
          <Receipt className="mx-auto mb-2 size-6 text-muted-foreground" />
          <p className="text-sm font-medium">No invoices yet</p>
          <p className="text-xs text-muted-foreground">
            Your first invoice will appear here right after your first payment.
          </p>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="divide-y rounded-xl border">
          {data.map((record: BillingRecord) => (
            <div key={record.id} className="flex items-center gap-3 p-4">
              <div className="rounded-lg border p-2 text-muted-foreground">
                <RefreshCw className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {record.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(record.paid_at)} ·{' '}
                  {formatMoney(record.amount, record.currency)}
                </p>
              </div>
              {record.invoice_pdf && (
                <a
                  href={record.invoice_pdf}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border p-2 text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
                  aria-label="Download invoice PDF"
                >
                  <Download className="size-4" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Plan management ── */

/** Human-readable label for the Stripe subscription status. */
function statusLabel(sub: Subscription): { text: string; tone: 'green' | 'red' | 'amber' | 'gray' } {
  if (sub.cancel_at_period_end && sub.status === 'active') {
    return { text: 'Cancelled', tone: 'red' }
  }
  if (isPaymentGraceExpired(sub)) {
    return { text: 'Access locked', tone: 'red' }
  }
  switch (sub.status) {
    case 'active':
      return { text: 'Active', tone: 'green' }
    case 'trialing':
      return { text: 'Trial', tone: 'green' }
    case 'past_due':
      return isInPaymentGracePeriod(sub)
        ? { text: 'Payment failed · grace period', tone: 'amber' }
        : { text: 'Past due', tone: 'red' }
    case 'paused':
      return { text: 'Paused', tone: 'amber' }
    case 'canceled':
    case 'incomplete_expired':
    case 'unpaid':
      return { text: 'Expired', tone: 'red' }
    case 'incomplete':
      return { text: 'Incomplete', tone: 'amber' }
    default:
      return { text: sub.status, tone: 'gray' }
  }
}

function PlanSection() {
  const queryClient = useQueryClient()
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => settingsApi.getSubscription(),
  })

  // The plans endpoint hits Stripe; only fetch it when the user actually
  // needs to subscribe (no active sub) so a happy-path active user doesn't
  // pay for a Stripe Prices read on every page open.
  const grantsAccess = !!subscription && subscriptionGrantsAccess(subscription)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }

  if (subscription?.status === 'incomplete') {
    return <PendingPaymentView />
  }

  if (!grantsAccess) {
    return <ChoosePlanView subscription={subscription ?? null} />
  }

  return (
    <ActiveSubView
      subscription={subscription as Subscription}
      onChanged={() => {
        queryClient.invalidateQueries({ queryKey: ['subscription'] })
        queryClient.invalidateQueries({ queryKey: ['billing-history'] })
      }}
    />
  )
}

/** Shown for `status='incomplete'` — checkout succeeded but extra auth (3DS) pending. */
function PendingPaymentView() {
  const portal = useMutation({
    mutationFn: () => settingsApi.createPortalSession(),
    onSuccess: ({ url }) => {
      window.location.href = url
    },
  })
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Verifying your payment…</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Your bank asked for an extra security step (3D Secure) to finish this
        payment. We'll activate your subscription as soon as it completes —
        usually within a couple of minutes.
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Didn't finish the step? Open billing to retry with another card.
      </p>
      <Button
        onClick={() => portal.mutate()}
        disabled={portal.isPending}
        size="xl"
      >
        <ExternalLink className="size-4" />
        {portal.isPending ? 'Opening…' : 'Open billing'}
      </Button>
    </div>
  )
}

/** Shown when the user has no active subscription — lists available plans. */
function ChoosePlanView({ subscription }: { subscription: Subscription | null }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const autoCheckoutStarted = useRef(false)
  const { data: plans, isLoading, isError } = useQuery({
    queryKey: ['plans'],
    queryFn: () => settingsApi.listPlans(),
  })

  const checkout = useMutation({
    mutationFn: (interval: BillingInterval) =>
      settingsApi.createCheckoutSession(interval),
    onSuccess: ({ url }) => {
      window.location.href = url
    },
  })

  const intervalParam = searchParams.get('interval')
  const autoInterval: BillingInterval | null =
    intervalParam === 'week_1' || intervalParam === 'week_4' || intervalParam === 'year'
      ? intervalParam
      : null

  const clearAutoCheckoutParams = useCallback(() => {
    const next = new URLSearchParams(searchParams)
    next.delete('interval')
    next.delete('from')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  /** USA landing sends users here after signup with ?interval=week_4&from=usa — start Stripe Checkout once. */
  useEffect(() => {
    if (!autoInterval || autoCheckoutStarted.current || checkout.isPending) return
    autoCheckoutStarted.current = true
    checkout.mutate(autoInterval)
    clearAutoCheckoutParams()
  }, [autoInterval, checkout.isPending, checkout.mutate, clearAutoCheckoutParams])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Choose a plan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Unlock the full AppEx experience. Cancel anytime.
        </p>
      </div>

      {subscription && isPaymentGraceExpired(subscription) && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
          Your last payment failed and the 24-hour grace period has ended. Choose a
          plan or update your payment method in billing to continue learning.
        </div>
      )}

      {subscription?.status === 'canceled' && (
        <div className="rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">
          Your previous subscription has ended. Pick a plan to continue learning.
        </div>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Loading plans…</p>}
      {autoInterval && checkout.isPending && (
        <p className="text-sm text-muted-foreground">Redirecting to secure checkout…</p>
      )}
      {isError && (
        <p className="text-sm text-destructive">
          Couldn't load plans. The store may be temporarily unavailable — try again
          in a moment.
        </p>
      )}

      {plans && (
        <div
          className={cn(
            'grid gap-3',
            plans.length >= 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'
          )}
        >
          {plans.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              loading={checkout.isPending && checkout.variables === p.id}
              onSelect={() => checkout.mutate(p.id)}
            />
          ))}
        </div>
      )}

      {checkout.isError && (
        <p className="text-sm text-destructive">
          Couldn't start checkout. Please try again.
        </p>
      )}
    </div>
  )
}

function PlanCard({
  plan,
  loading,
  onSelect,
}: {
  plan: Plan
  loading: boolean
  onSelect: () => void
}) {
  const isYearly = plan.id === 'year'
  const isFourWeek = plan.id === 'week_4'
  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border p-5',
        isFourWeek && 'ring-2 ring-primary/30'
      )}
    >
      <p className="text-sm font-semibold">{planCardTitle(plan.id)}</p>
      {plan.intro_amount != null && plan.intro_amount < plan.amount ? (
        <div className="mt-2">
          <p className="text-2xl font-bold">
            {formatMoney(plan.intro_amount, plan.currency)}{' '}
            <span className="text-sm font-normal text-muted-foreground">
              first {plan.interval_label}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            then {formatMoney(plan.amount, plan.currency)} every{' '}
            {plan.interval_label}
          </p>
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-2xl font-bold">
            {formatMoney(plan.amount, plan.currency)}{' '}
            <span className="text-sm font-normal text-muted-foreground">
              / {plan.interval_label}
            </span>
          </p>
          {isYearly && (
            <p className="text-xs text-emerald-600">Save vs. shorter plans</p>
          )}
        </div>
      )}
      <div className="mt-auto pt-4">
        <Button onClick={onSelect} disabled={loading} size="xl" className="w-full">
          {loading ? 'Redirecting…' : isYearly ? 'Get yearly plan' : 'Subscribe'}
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

/** Active/paused/past_due subscription view. */
function ActiveSubView({
  subscription,
  onChanged,
}: {
  subscription: Subscription
  onChanged: () => void
}) {
  const [cancelOpen, setCancelOpen] = useState(false)
  const status = statusLabel(subscription)
  const periodLabel = billingPeriodLabel(subscription.billing_interval)

  const pause = useMutation({
    mutationFn: () => settingsApi.pauseSubscription(),
    onSuccess: onChanged,
  })
  const resume = useMutation({
    mutationFn: () => settingsApi.resumeSubscription(),
    onSuccess: onChanged,
  })
  const reactivate = useMutation({
    mutationFn: () => settingsApi.reactivateSubscription(),
    onSuccess: onChanged,
  })
  const portal = useMutation({
    mutationFn: () => settingsApi.createPortalSession(),
    onSuccess: ({ url }) => {
      window.location.href = url
    },
  })

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Subscription management</h2>

      {subscription.cancel_at_period_end && (
        <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3.5 text-sm leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">Cancellation confirmed</p>
          <p className="mt-1">
            You'll keep full access until{' '}
            <span className="font-medium text-foreground">
              {formatDate(subscription.current_period_end)}
            </span>
            . A confirmation email has been sent to your inbox.
          </p>
        </div>
      )}

      {isInPaymentGracePeriod(subscription) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-medium">Payment failed</p>
          <p className="mt-1">
            You still have full access for{' '}
            {formatGraceTimeRemaining(subscription.payment_failed_at)}. Update your
            payment method to avoid losing access.
          </p>
          <Button
            className="mt-3"
            variant="outline"
            size="sm"
            onClick={() => portal.mutate()}
            disabled={portal.isPending}
          >
            <ExternalLink className="size-4" />
            {portal.isPending ? 'Opening…' : 'Update payment method'}
          </Button>
        </div>
      )}

      <div>
        <h3 className="mb-3 text-base font-bold">Your subscription plan</h3>
        <div className="divide-y rounded-xl border">
          <Row label="Status">
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-medium',
                status.tone === 'green' && 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
                status.tone === 'red' && 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
                status.tone === 'amber' && 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
                status.tone === 'gray' && 'bg-muted text-muted-foreground'
              )}
            >
              {status.text}
            </span>
          </Row>
          <Row label="Subscription price">
            <span className="text-sm font-medium">
              {formatMoney(subscription.price, subscription.currency)} / {periodLabel}
            </span>
          </Row>
          {subscription.cancel_at_period_end ? (
            <Row label="Access until">
              <span className="text-sm font-medium">
                {formatDate(subscription.current_period_end)}
              </span>
            </Row>
          ) : (
            <Row label="Renewal date">
              <span className="text-sm font-medium">
                {formatDate(subscription.renewal_date ?? subscription.current_period_end)}
              </span>
            </Row>
          )}
        </div>
      </div>

      {/* Quick actions row */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          onClick={() => portal.mutate()}
          disabled={portal.isPending}
          variant="outline"
          size="xl"
          className="w-full"
        >
          <ExternalLink className="size-4" />
          {portal.isPending ? 'Opening…' : 'Manage billing'}
        </Button>

        {subscription.cancel_at_period_end ? (
          <Button
            onClick={() => reactivate.mutate()}
            disabled={reactivate.isPending}
            size="xl"
            className="w-full"
          >
            {reactivate.isPending ? 'Working…' : 'Resume subscription'}
          </Button>
        ) : subscription.status === 'paused' ? (
          <Button
            onClick={() => resume.mutate()}
            disabled={resume.isPending}
            size="xl"
            className="w-full"
          >
            {resume.isPending ? 'Working…' : 'Resume subscription'}
          </Button>
        ) : (
          <Button
            onClick={() => pause.mutate()}
            disabled={pause.isPending}
            variant="outline"
            size="xl"
            className="w-full"
          >
            <Hourglass className="size-4" />
            {pause.isPending ? 'Pausing…' : 'Pause subscription'}
          </Button>
        )}
      </div>

      {!subscription.cancel_at_period_end && subscription.status !== 'canceled' && (
        <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3.5">
          <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
            Need to cancel? You must cancel at least 24 hours before your renewal
            date. Your access stays active until the end of the current billing period.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCancelOpen(true)}
            className="border-border/70 bg-background/60 font-medium text-foreground/80 shadow-none hover:border-border hover:bg-background hover:text-foreground"
          >
            Cancel subscription
          </Button>
        </div>
      )}

      <CancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        subscription={subscription}
        onDone={() => {
          onChanged()
        }}
      />
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  )
}

/** Cancel modal with yearly win-back offer and platform-consistent dialog styling. */
function CancelDialog({
  open,
  onOpenChange,
  subscription,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscription: Subscription
  onDone: () => void
}) {
  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: () => settingsApi.listPlans(),
    enabled: open,
  })
  const yearly = plans?.find((p) => p.id === 'year')
  const showWinBack = subscription.billing_interval !== 'year' && !!yearly
  const currentInterval = subscription.billing_interval ?? 'week_4'
  const yearlySavings =
    yearly && showWinBack
      ? Math.max(0, annualPlanCost(subscription.price, currentInterval) - yearly.amount)
      : 0

  const switchPlan = useMutation({
    mutationFn: () => settingsApi.switchToYearly(),
    onSuccess: () => {
      onDone()
      onOpenChange(false)
    },
  })
  const cancel = useMutation({
    mutationFn: () => settingsApi.cancelSubscription(),
    onSuccess: () => {
      onDone()
      onOpenChange(false)
    },
  })

  const accessUntil = formatDate(subscription.current_period_end)
  const errorMessage =
    cancel.error instanceof Error
      ? cancel.error.message
      : switchPlan.error instanceof Error
        ? switchPlan.error.message
        : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        {showWinBack ? (
          <>
            <div className="border-b border-orange-100 bg-linear-to-br from-orange-50 via-amber-50 to-white px-6 pb-5 pt-8 text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-linear-to-br from-amber-400 to-orange-500 text-white shadow-lg">
                <Sparkles className="size-6" strokeWidth={2.5} />
              </div>
              <DialogHeader className="space-y-2 sm:text-center">
                <DialogTitle className="text-center text-2xl font-bold tracking-tight">
                  Don't lose your savings
                </DialogTitle>
                <DialogDescription className="text-center text-base">
                  Switch to yearly and keep learning for less.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex flex-col gap-5 px-6 py-6">
              {yearly && (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-5 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Yearly plan
                  </p>
                  <p className="mt-2 text-3xl font-bold tracking-tight">
                    {formatMoney(yearly.amount, yearly.currency)}
                    <span className="ml-1 text-base font-normal text-muted-foreground">
                      / year
                    </span>
                  </p>
                  {yearlySavings > 0 && (
                    <p className="mt-2 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 dark:bg-green-900/40 dark:text-green-200">
                      Save {formatMoney(yearlySavings, yearly.currency)} per year
                    </p>
                  )}
                </div>
              )}

              <ul className="space-y-2.5 text-sm">
                <li className="flex items-start gap-2.5">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-orange-500" />
                  <span>Keep unlimited access to every skill and lesson</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-orange-500" />
                  <span>One simple annual payment — fewer renewals to manage</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-orange-500" />
                  <span>Cancel anytime from settings</span>
                </li>
              </ul>

              <div className="flex flex-col gap-2.5">
                <Button
                  onClick={() => switchPlan.mutate()}
                  disabled={switchPlan.isPending || cancel.isPending}
                  size="xl"
                  className="w-full"
                >
                  {switchPlan.isPending ? 'Switching…' : 'Switch to yearly plan'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xl"
                  className="w-full"
                  onClick={() => onOpenChange(false)}
                >
                  Keep current plan
                </Button>
                <button
                  type="button"
                  onClick={() => cancel.mutate()}
                  disabled={cancel.isPending || switchPlan.isPending}
                  className="py-1 text-sm text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                >
                  {cancel.isPending ? 'Cancelling…' : 'Yes, cancel my subscription'}
                </button>
              </div>

              {errorMessage && (
                <p className="text-center text-sm text-destructive">{errorMessage}</p>
              )}
            </div>
          </>
        ) : (
          <div className="px-6 py-6">
            <DialogHeader className="space-y-3 sm:text-center">
              <div className="mx-auto mb-1 flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Hourglass className="size-6" strokeWidth={2} />
              </div>
              <DialogTitle className="text-center text-2xl font-bold tracking-tight">
                Cancel subscription?
              </DialogTitle>
              <DialogDescription className="text-center text-base leading-relaxed">
                You'll keep full access until{' '}
                <span className="font-medium text-foreground">{accessUntil}</span>. After
                that, premium content will be locked.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 flex flex-col gap-2.5">
              <Button
                type="button"
                size="xl"
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                Keep current plan
              </Button>
              <Button
                onClick={() => cancel.mutate()}
                disabled={cancel.isPending}
                variant="outline"
                size="xl"
                className="w-full border-border/70 text-foreground/80 hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
              >
                {cancel.isPending ? 'Cancelling…' : 'Confirm cancellation'}
              </Button>
            </div>

            {errorMessage && (
              <p className="mt-4 text-center text-sm text-destructive">{errorMessage}</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/* ── Contact us ── */
function ContactSection() {
  const subjectRef = useRef<HTMLInputElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)
  const [category, setCategory] = useState<
    'general' | 'bug' | 'billing' | 'content' | 'feedback' | 'other'
  >('general')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(false)

  async function handleSend() {
    const subject = subjectRef.current?.value.trim() ?? ''
    const message = messageRef.current?.value.trim() ?? ''
    if (!subject || !message) return

    setSending(true)
    setSent(false)
    setError(false)
    try {
      await settingsApi.submitContact({ subject, message, category })
      setSent(true)
      if (subjectRef.current) subjectRef.current.value = ''
      if (messageRef.current) messageRef.current.value = ''
    } catch {
      setError(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Contact us</h2>
      <p className="text-sm text-muted-foreground">
        Have questions or need help? Reach out and we'll get back to you as soon
        as possible.
      </p>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="contact-category" className="text-sm font-medium">Category</label>
          <select
            id="contact-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
            className="w-full rounded-lg border bg-muted/30 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-ring sm:text-sm"
          >
            <option value="general">General</option>
            <option value="feedback">Feedback</option>
            <option value="bug">Bug / technical issue</option>
            <option value="billing">Billing</option>
            <option value="content">Course content</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="contact-subject" className="text-sm font-medium">Subject</label>
          <input
            id="contact-subject"
            ref={subjectRef}
            type="text"
            placeholder="What can we help with?"
            className="w-full rounded-lg border bg-muted/30 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-ring sm:text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="contact-message" className="text-sm font-medium">Message</label>
          <textarea
            id="contact-message"
            ref={messageRef}
            rows={5}
            placeholder="Describe your issue or question..."
            className="w-full resize-none rounded-lg border bg-muted/30 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-ring sm:text-sm"
          />
        </div>
        {sent && (
          <p className="text-sm font-medium text-emerald-600">
            Message sent successfully!
          </p>
        )}
        {error && (
          <p className="text-sm font-medium text-destructive">
            Couldn't send your message — please try again.
          </p>
        )}
        <Button
          onClick={handleSend}
          disabled={sending}
          size="xl"
        >
          {sending ? 'Sending...' : 'Send message'}
        </Button>
      </div>
    </div>
  )
}
