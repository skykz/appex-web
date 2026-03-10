import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  BadgeCheck,
  Lock,
  Receipt,
  CreditCard,
  HelpCircle,
  Eye,
  EyeOff,
  LogOut,
  ArrowLeft,
  ChevronDown,
  RefreshCw,
  Hourglass,
} from 'lucide-react'
import { cn } from '@shared/lib'
import { Button } from '@shared/ui'
import { useAuthStore, userApi } from '@entities/user'
import { settingsApi } from './api'

type Section = 'account' | 'password' | 'billing' | 'plan' | 'contact'

const navItems: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'account', label: 'Account', icon: BadgeCheck },
  { id: 'password', label: 'Password', icon: Lock },
  { id: 'billing', label: 'Billing history', icon: Receipt },
  { id: 'plan', label: 'Plan management', icon: CreditCard },
  { id: 'contact', label: 'Contact us', icon: HelpCircle },
]

export default function SettingsPage() {
  const [section, setSection] = useState<Section>('account')

  return (
    <div className="relative min-h-dvh w-full py-2">
      <div className="px-4">
        <div className="mb-1 flex items-center gap-2 text-muted-foreground">
          <FileText className="size-4" />
          <span className="text-sm font-medium">Settings</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and subscription settings.
        </p>

        <div className="mt-6 flex flex-col gap-8 lg:flex-row">
          <nav className="w-full shrink-0 lg:w-52">
            <div className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    section === item.id
                      ? 'bg-muted'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  )}
                >
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
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

/* ── Account ── */
function AccountSection() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const setUser = useAuthStore((s) => s.setUser)
  const nameRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const name = nameRef.current?.value.trim()
    if (!name) return
    setSaving(true)
    try {
      const updated = await userApi.updateProfile({ name })
      setUser(updated)
    } catch {
      // TODO: show error toast
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
            className="w-full rounded-lg border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="settings-email" className="text-sm font-medium">Email</label>
          <input
            id="settings-email"
            type="email"
            defaultValue={user?.email ?? ''}
            disabled
            className="w-full rounded-lg border bg-muted/30 px-3 py-2.5 text-sm outline-none opacity-60"
          />
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          size="xl"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </Button>
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
        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-600">Password updated successfully</p>}
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
function BillingSection() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Billing history</h2>
      <div className="rounded-xl border">
        <button
          type="button"
          className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/30"
        >
          <RefreshCw className="size-5 shrink-0 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-semibold">$15.19</p>
            <p className="text-sm text-muted-foreground">
              4 week subscription plan
            </p>
            <p className="text-xs text-muted-foreground">Jan 27, 2026</p>
          </div>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}

/* ── Plan management ── */
function PlanSection() {
  const [pausing, setPausing] = useState(false)

  async function handlePause() {
    setPausing(true)
    try {
      await settingsApi.pauseSubscription()
    } catch {
      // TODO: show error toast
    } finally {
      setPausing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg border p-1.5">
          <ArrowLeft className="size-4" />
        </div>
      </div>

      <h2 className="text-xl font-bold">Manage subscription</h2>

      <div>
        <h3 className="mb-3 text-base font-bold">Your subscription plan</h3>
        <div className="rounded-xl border divide-y">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm">Status</span>
            <span className="text-sm font-medium">Active</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm">Introductory price</span>
            <span className="text-sm font-medium">$15.19</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm">Subscription price</span>
            <span className="text-sm font-medium">$39.99/mo</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm">Renewal date</span>
            <span className="text-sm font-medium">Feb 24, 2026</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-base font-bold">
          Need a break? Pause your plan
        </h3>
        <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
          Too busy to focus on your learning right now? Pause your subscription
          and when you come back, you'll be ready to reach your goals.
        </p>
        <Button
          onClick={handlePause}
          disabled={pausing}
          size="xl"
          className="w-full"
        >
          <Hourglass className="size-4" />
          {pausing ? 'Pausing...' : 'Pause subscription'}
        </Button>
      </div>

      <div>
        <h3 className="mb-2 text-base font-bold">
          Stay in control with your renewal reminder
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Enjoy your subscription without worry. Get a heads up 3 days before
          your subscription renews — so you always know what's next.
        </p>
      </div>
    </div>
  )
}

/* ── Contact us ── */
function ContactSection() {
  const subjectRef = useRef<HTMLInputElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSend() {
    const subject = subjectRef.current?.value.trim() ?? ''
    const message = messageRef.current?.value.trim() ?? ''
    if (!subject || !message) return

    setSending(true)
    try {
      await settingsApi.submitContact({ subject, message })
      setSent(true)
      if (subjectRef.current) subjectRef.current.value = ''
      if (messageRef.current) messageRef.current.value = ''
    } catch {
      // TODO: show error toast
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
          <label htmlFor="contact-subject" className="text-sm font-medium">Subject</label>
          <input
            id="contact-subject"
            ref={subjectRef}
            type="text"
            placeholder="What can we help with?"
            className="w-full rounded-lg border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="contact-message" className="text-sm font-medium">Message</label>
          <textarea
            id="contact-message"
            ref={messageRef}
            rows={5}
            placeholder="Describe your issue or question..."
            className="w-full resize-none rounded-lg border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {sent && <p className="text-sm text-green-600">Message sent successfully!</p>}
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
