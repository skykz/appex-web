import { Sparkles, Lock } from 'lucide-react'
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-full bg-linear-to-br from-amber-400 to-orange-500 text-white shadow-lg">
            <Lock className="size-6" strokeWidth={2.5} />
          </div>
          <DialogTitle className="text-center text-2xl">
            {paymentGraceExpired ? 'Access locked' : 'Premium content'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {blockedContent ? (
              <>
                <span className="font-medium text-foreground">{blockedContent}</span>
                <br />
              </>
            ) : null}
            {paymentGraceExpired ? (
              <>
                Your last payment failed and the 24-hour grace period has ended.
                Renew your plan to unlock every skill, lesson, and unlimited AI chat.
              </>
            ) : (
              <>
                is part of AppEx Premium. Unlock every skill, every lesson, and
                unlimited AI chat for one low price.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <ul className="mt-3 space-y-2.5 rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
          <li className="flex items-start gap-2.5">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>All skills unlocked — no limits</span>
          </li>
          <li className="flex items-start gap-2.5">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>Unlimited AI chat &amp; assistants</span>
          </li>
          <li className="flex items-start gap-2.5">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>Cancel anytime from settings</span>
          </li>
        </ul>

        <div className="mt-5 flex flex-col gap-2.5">
          <Button
            onClick={() => {
              onOpenChange(false)
              navigate('/settings?section=plan')
            }}
            size="xl"
            className="w-full"
          >
            <Sparkles className="size-4" />
            {paymentGraceExpired ? 'Renew subscription' : 'See plans'}
          </Button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Maybe later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
