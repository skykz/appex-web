import { BookOpenCheck, Lock, MessageCircleMore, ShieldCheck, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@shared/ui'
import { useSubscriptionSummary } from '@entities/subscription'

interface PaywallDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Optional label shown above the title (e.g. lesson or skill title that was clicked). */
  blockedContent?: string
}

/**
 * Generic paywall dialog when premium content is locked.
 * Routes to plan settings; copy adapts when payment grace has expired.
 */
export function PaywallDialog({ open, onOpenChange, blockedContent }: PaywallDialogProps) {
  const navigate = useNavigate()
  const { paymentGraceExpired } = useSubscriptionSummary()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-border/70 p-0 sm:max-w-[30rem]">
        <DialogHeader className="relative overflow-hidden border-b border-orange-100 bg-linear-to-b from-orange-50 via-orange-50/60 to-background px-6 pb-6 pt-7 text-center dark:border-orange-950/60 dark:from-orange-950/30 dark:via-orange-950/10">
          <div className="pointer-events-none absolute -right-12 -top-16 size-40 rounded-full bg-orange-300/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 top-12 size-32 rounded-full bg-amber-200/20 blur-3xl" />
          <div className="relative mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-linear-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/20 ring-4 ring-white/80 dark:ring-background/80">
            <Lock className="size-5" strokeWidth={2.4} />
          </div>
          <div className="relative mx-auto mb-2 flex w-fit items-center gap-1.5 rounded-full border border-orange-200/80 bg-white/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-orange-600 shadow-xs dark:bg-background/70">
            <Sparkles className="size-3" aria-hidden />
            AppEx Premium
          </div>
          <DialogTitle className="relative text-center text-[1.65rem] leading-tight tracking-tight">
            {paymentGraceExpired ? 'Access locked' : 'Premium content'}
          </DialogTitle>
          <DialogDescription className="relative mx-auto mt-2 max-w-sm text-center leading-6">
            {blockedContent ? (
              <>
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Unlock access to</span>
                <span className="block font-semibold text-foreground">{blockedContent}</span>
              </>
            ) : null}
            {paymentGraceExpired ? (
              <span className="mt-2 block">
                Your last payment failed and the 24-hour grace period has ended.
                Renew your plan to restore full access.
              </span>
            ) : (
              <span className="mt-2 block">
                Learn without limits with every course, lesson, and AI assistant included.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
          <ul className="divide-y divide-border/60" aria-label="Premium benefits">
          <li className="flex items-center gap-3 py-3 first:pt-1">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/40">
              <BookOpenCheck className="size-[18px]" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">Every course and lesson</span>
              <span className="block text-xs leading-5 text-muted-foreground">Explore the complete learning library.</span>
            </span>
          </li>
          <li className="flex items-center gap-3 py-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/40">
              <MessageCircleMore className="size-[18px]" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">Unlimited AI assistance</span>
              <span className="block text-xs leading-5 text-muted-foreground">Keep learning without chat limits.</span>
            </span>
          </li>
          <li className="flex items-center gap-3 py-3 last:pb-1">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/40">
              <ShieldCheck className="size-[18px]" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">Simple and flexible</span>
              <span className="block text-xs leading-5 text-muted-foreground">Manage or cancel your plan anytime.</span>
            </span>
          </li>
          </ul>

          <div className="mt-5 flex flex-col gap-3">
          <Button
            onClick={() => {
              onOpenChange(false)
              navigate('/settings?section=plan')
            }}
            size="xl"
            className="h-12 w-full rounded-xl bg-linear-to-r from-orange-500 to-orange-600 font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5 hover:from-orange-600 hover:to-orange-600 hover:shadow-xl hover:shadow-orange-500/25"
          >
            <Sparkles className="size-4" />
            {paymentGraceExpired ? 'Renew subscription' : 'See plans'}
          </Button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="mx-auto rounded-md px-3 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Maybe later
          </button>
          <p className="text-center text-[11px] text-muted-foreground/80">Secure checkout · Cancel anytime</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
