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
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  /**
   * Resets transient fields whenever the dialog is closed.
   */
  function handleOpenChange(next: boolean) {
    if (!next) {
      setDetails('')
      setError(null)
      setSent(false)
    }
    onOpenChange(next)
  }

  /**
   * Posts the issue to the shared contact inbox with category `bug` and a machine-readable subject line.
   */
  async function handleSubmit() {
    const trimmed = details.trim()
    if (!trimmed) {
      setError('Please describe what went wrong.')
      return
    }
    setSending(true)
    setError(null)
    try {
      await lessonApi.reportIssue({
        lessonId,
        lessonLabel,
        stepIndex,
        stepCount,
        details: trimmed,
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <Flag className="size-4" aria-hidden />
            </div>
            <div>
              <DialogTitle>Report an issue</DialogTitle>
              <DialogDescription className="text-left">
                Tell us what broke or was confusing. We log this with your account and
                lesson so we can fix it.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <p className="text-muted-foreground text-xs">
            Lesson <span className="font-mono text-foreground">{lessonId}</span> ·{' '}
            {lessonLabel} · Step {stepIndex + 1} of {stepCount}
          </p>
          <Label htmlFor="lesson-issue-details">What happened?</Label>
          <Textarea
            id="lesson-issue-details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="e.g. Quiz would not submit, video did not load, text was cut off…"
            rows={5}
            className="resize-none"
            disabled={sending || sent}
          />
        </div>

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        {sent ? (
          <p className="text-sm font-medium text-emerald-600" role="status">
            Thanks — we received your report.
          </p>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={sending || sent}>
            {sending ? 'Sending…' : sent ? 'Sent' : 'Send report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
