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

interface PaywallDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Optional label shown above the title (e.g. lesson or skill title that was clicked). */
  blockedContent?: string
}

/**
 * Generic "this is Premium" dialog shown whenever a free user tries to open
 * gated content. CTA routes to /settings?section=plan; the actual checkout
 * (with intro coupon) lives there. We don't trigger Stripe Checkout directly
 * from this modal to keep one source of truth for plan selection.
 */
export function PaywallDialog({ open, onOpenChange, blockedContent }: PaywallDialogProps) {
  const navigate = useNavigate()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
            <Lock className="size-6" strokeWidth={2.5} />
          </div>
          <DialogTitle className="text-center text-2xl">
            Premium content
          </DialogTitle>
          <DialogDescription className="text-center">
            {blockedContent ? (
              <>
                <span className="font-medium text-foreground">{blockedContent}</span>
                <br />
              </>
            ) : null}
            is part of AppEx Premium. Unlock every skill, every lesson, and
            unlimited AI chat for one low price.
          </DialogDescription>
        </DialogHeader>

        <ul className="mt-2 space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-orange-500" />
            <span>All skills unlocked — no limits</span>
          </li>
          <li className="flex items-start gap-2">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-orange-500" />
            <span>Unlimited AI chat &amp; assistants</span>
          </li>
          <li className="flex items-start gap-2">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-orange-500" />
            <span>Cancel anytime from settings</span>
          </li>
        </ul>

        <div className="mt-4 flex flex-col gap-2">
          <Button
            onClick={() => {
              onOpenChange(false)
              navigate('/settings?section=plan')
            }}
            size="xl"
            className="w-full"
          >
            <Sparkles className="size-4" />
            See plans
          </Button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="mt-1 text-sm text-muted-foreground hover:text-foreground"
          >
            Maybe later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
