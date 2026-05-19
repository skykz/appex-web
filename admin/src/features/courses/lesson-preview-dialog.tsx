import { useEffect, useMemo, useState } from 'react'
import {
  stripQuizAnswersFromSteps,
  type LessonBlockLearner,
  type LessonEditorFormValues,
  type LessonStepLearner,
} from '@appex/lesson-schema'
import { LessonPreviewBlocks } from './lesson-preview-blocks'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@shared/ui/dialog'
import { Button } from '@shared/ui/button'
import { EmojiOrImageBadge } from '@shared/ui/emoji-or-image-badge'

interface LessonPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  label: string
  title: string
  emoji: string
  steps: LessonEditorFormValues['steps']
}

const EMPTY_STEP: LessonStepLearner = {
  blocks: [
    {
      type: 'text',
      content: 'Nothing to preview yet — add blocks to a step.',
    },
  ],
}

/**
 * Converts editor steps into learner-shaped steps with quiz keys stripped for a faithful static preview.
 */
function buildPreviewSteps(steps: LessonEditorFormValues['steps']): LessonStepLearner[] {
  const raw = stripQuizAnswersFromSteps(steps)
  if (!Array.isArray(raw)) return [EMPTY_STEP]

  const out: LessonStepLearner[] = []
  for (const s of raw) {
    if (!s || typeof s !== 'object' || !('blocks' in s)) continue
    const blocks = (s as { blocks: unknown }).blocks
    if (!Array.isArray(blocks) || blocks.length === 0) continue
    out.push({ blocks: blocks as LessonBlockLearner[] })
  }
  return out.length > 0 ? out : [EMPTY_STEP]
}

/**
 * Full-screen dialog that walks draft steps like the learner lesson player (read-only).
 */
export function LessonPreviewDialog({
  open,
  onOpenChange,
  label,
  title,
  emoji,
  steps,
}: LessonPreviewDialogProps) {
  const previewSteps = useMemo(() => buildPreviewSteps(steps), [steps])
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    if (!open) return
    setStepIndex(0)
  }, [open])

  useEffect(() => {
    setStepIndex((i) => Math.min(Math.max(0, i), Math.max(0, previewSteps.length - 1)))
  }, [previewSteps.length])

  const total = previewSteps.length
  const isFirst = stepIndex <= 0
  const isLast = stepIndex >= total - 1
  const current = previewSteps[stepIndex] ?? EMPTY_STEP

  /**
   * Closes the preview shell (used from the bottom bar on the last step).
   */
  function closePreview() {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[94vh] w-[calc(100vw-1.5rem)] max-w-5xl flex-col gap-0 overflow-hidden border-border/80 p-0 sm:max-w-5xl xl:max-w-6xl">
        <DialogHeader className="shrink-0 border-b border-border/60 bg-muted/30 px-6 py-5 text-left">
          <DialogTitle className="flex flex-wrap items-center gap-2 text-lg">
            <EmojiOrImageBadge value={emoji || '📘'} frameClassName="h-10 w-10 text-2xl" />
            <span className="font-mono text-sm text-muted-foreground">{label}</span>
            <span className="min-w-0 truncate font-semibold text-foreground">{title}</span>
            <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground ring-1 ring-border/70">
              Preview
            </span>
          </DialogTitle>
          <DialogDescription>
            Approximate learner layout. Quizzes and submissions are not interactive here; save and test
            in the app for full behavior.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 border-b border-border/50 bg-background/95 px-6 py-3">
          <div className="flex gap-1">
            {previewSteps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= stepIndex ? 'bg-gradient-to-r from-primary to-orange-400' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Step {stepIndex + 1} of {total}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl rounded-2xl border border-border/50 bg-card/40 px-4 py-6 shadow-sm ring-1 ring-black/[0.03] sm:px-8 sm:py-8 lg:px-10 dark:ring-white/[0.06]">
            <LessonPreviewBlocks blocks={current.blocks} />
          </div>
        </div>

        <div className="shrink-0 border-t border-border/80 bg-background/95 px-6 py-4">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <Button type="button" variant="outline" disabled={isFirst} onClick={() => setStepIndex((s) => s - 1)}>
              Back
            </Button>
            {isLast ? (
              <Button type="button" className="flex-1" onClick={closePreview}>
                Close preview
              </Button>
            ) : (
              <Button type="button" className="flex-1" onClick={() => setStepIndex((s) => s + 1)}>
                Continue
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
