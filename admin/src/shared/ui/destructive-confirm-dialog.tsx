import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/ui/dialog'
import { Button } from '@shared/ui/button'

interface DestructiveConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  isPending?: boolean
  errorMessage?: string | null
  hardConfirmLabel?: string
  /** Invoked after user confirms; close dialog in parent on success. */
  onConfirm: () => void
  /** Optional second action that bypasses normal server-side deletion blockers. */
  onHardConfirm?: () => void
}

/**
 * Modal confirmation for irreversible admin actions (replaces window.confirm for consistent UX).
 */
export function DestructiveConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isPending,
  errorMessage,
  hardConfirmLabel = 'Hard delete',
  onConfirm,
  onHardConfirm,
}: DestructiveConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg overflow-hidden border-border/80 p-0">
        <DialogHeader className="px-6 pb-2 pt-6 text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-pretty leading-relaxed">{description}</DialogDescription>
        </DialogHeader>
        {errorMessage ? (
          <div
            role="alert"
            className="mx-6 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {errorMessage}
          </div>
        ) : null}
        {onHardConfirm ? (
          <div className="mx-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-destructive">Hard delete</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Bypasses blockers and can permanently remove learner progress, submissions, and
                  quiz attempts.
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                className="shrink-0 sm:min-w-32"
                disabled={isPending}
                onClick={() => {
                  onHardConfirm()
                }}
              >
                {hardConfirmLabel}
              </Button>
            </div>
          </div>
        ) : null}
        <DialogFooter className="mt-2 flex-col-reverse gap-2 border-t border-border/60 bg-muted/20 px-6 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="w-full sm:w-auto"
            disabled={isPending}
            onClick={() => {
              onConfirm()
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
