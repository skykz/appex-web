import { useState } from 'react'
import { Flag } from 'lucide-react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from '@shared/ui'
import { lessonApi } from './api'

type LessonIssueReportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  lessonId: number
  lessonLabel: string
  stepIndex: number
  stepCount: number
}

const ISSUE_VARIANTS = [
  'Incorrect spelling or grammar',
  'Outdated content',
  'My language is not available',
  'Video not working',
  'Hard to understand',
  'Incorrect translation',
] as const

/**
 * Sends a structured report to `POST /api/contact` so support sees lesson id, step, and user notes (authenticated user_id on server).
 */
export function LessonIssueReportDialog({
  open,
  onOpenChange,
  lessonId,
  lessonLabel,
  stepIndex,
  stepCount,
}: LessonIssueReportDialogProps) {
  const [details, setDetails] = useState('')
  const [selectedVariants, setSelectedVariants] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  /**
   * Resets transient fields whenever the dialog is closed.
   */
  function handleOpenChange(next: boolean) {
    if (!next) {
      setDetails('')
      setSelectedVariants([])
      setError(null)
      setSent(false)
    }
    onOpenChange(next)
  }

  /**
   * Toggles one predefined issue reason without needing a long free-text message.
   */
  function toggleVariant(variant: string) {
    setSelectedVariants((current) =>
      current.includes(variant)
        ? current.filter((item) => item !== variant)
        : [...current, variant]
    )
  }

  /**
   * Posts the issue to the shared contact inbox with category `bug` and a machine-readable subject line.
   */
  async function handleSubmit() {
    const trimmed = details.trim()
    if (!trimmed && selectedVariants.length === 0) {
      setError('Choose at least one issue type or describe what went wrong.')
      return
    }
    const message = [
      selectedVariants.length > 0 ? `Issue types: ${selectedVariants.join(', ')}` : null,
      trimmed ? `Details: ${trimmed}` : null,
    ]
      .filter(Boolean)
      .join('\n\n')

    setSending(true)
    setError(null)
    try {
      await lessonApi.reportIssue({
        lessonId,
        lessonLabel,
        stepIndex,
        stepCount,
        details: message,
      })
      setSent(true)
      window.setTimeout(() => handleOpenChange(false), 1500)
    } catch {
      setError('Could not send report. Check your connection and try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-xl p-0">
        <DialogHeader className="border-b border-border/70 px-5 pb-3 pr-14 pt-4 text-left">
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <Flag className="size-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base">Report an issue</DialogTitle>
              <DialogDescription className="sr-only">
                Tell us about content mistakes, broken media, confusing text, or technical
                errors. We log this with your account and lesson so we can fix it.
              </DialogDescription>
              <p className="truncate text-xs text-muted-foreground">
                Lesson <span className="font-mono text-foreground">{lessonId}</span> ·{' '}
                {lessonLabel} · Step {stepIndex + 1}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 px-5 py-4 sm:px-6">
          <div className="space-y-2">
            <Label>What is the issue?</Label>
            <div className="grid grid-cols-2 gap-2">
              {ISSUE_VARIANTS.map((variant) => {
                const checked = selectedVariants.includes(variant)
                return (
                  <label
                    key={variant}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 bg-background px-2.5 py-2 text-[13px] font-medium leading-tight transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <input
                      type="checkbox"
                      className="size-4 shrink-0 rounded border-border accent-primary"
                      checked={checked}
                      onChange={() => toggleVariant(variant)}
                      disabled={sending || sent}
                    />
                    <span>{variant}</span>
                  </label>
                )
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lesson-issue-details">More details optional</Label>
            <Textarea
              id="lesson-issue-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Add exact sentence, timestamp, or anything else that helps us fix it faster..."
              rows={3}
              className="resize-none"
              disabled={sending || sent}
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {sent ? (
            <p className="text-sm font-medium text-emerald-600" role="status">
              Thanks — we received your report.
            </p>
          ) : null}
        </div>

        <DialogFooter className="gap-2 border-t border-border/70 bg-muted/20 px-5 py-3 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => handleOpenChange(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={() => void handleSubmit()}
            disabled={sending || sent}
          >
            {sending ? 'Sending…' : sent ? 'Sent' : 'Send report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
