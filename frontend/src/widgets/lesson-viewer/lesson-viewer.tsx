import type React from 'react'
import { useState, useEffect } from 'react'
import { ExternalLink, FileText, Flag, X } from 'lucide-react'
import { cn } from '@shared/lib'
import {
  Avatar,
  AvatarFallback,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@shared/ui'
import { type LessonContent, type LessonBlock } from './lesson-types'
import { LessonCompleteScreen } from './lesson-complete-screen'
import { DayStreakScreen } from './day-streak-screen'
import {
  CalloutBlockView,
  PromptBlockView,
  QuizBlockView,
  SubmissionBlockView,
} from './lesson-interactive-blocks'
import { LessonIssueReportDialog } from './lesson-issue-report-dialog'
import { LessonAssistantWidget } from './lesson-assistant-widget'
import { renderLinkedText } from './render-linked-text'

type Phase = 'lesson' | 'complete' | 'streak'

interface LessonViewerProps {
  content: LessonContent
  /** Shown in the header and completion screens (e.g. lesson label from CMS). */
  lessonLabel?: string
  /** Restores the learner to their last saved step when opening a lesson. */
  initialStepIndex?: number
  /** Persists step index to the server when the learner moves between steps. */
  onStepChange?: (stepIndex: number) => void | Promise<void>
  onClose: () => void
  /** Called after the feedback step; navigate or invalidate here (keep fast — no heavy awaits). */
  onFinish: () => void
  /**
   * After the learner confirms the feedback screen: mark lesson complete and check streak.
   * Return `showDayStreak: true` only for the first streak activity of the day to show the celebration screen.
   */
  onAfterFeedbackCommit: () => Promise<{ showDayStreak: boolean }>
}

export function LessonViewer({
  content,
  lessonLabel = 'Lesson 1',
  initialStepIndex = 0,
  onStepChange,
  onClose,
  onFinish,
  onAfterFeedbackCommit,
}: LessonViewerProps) {
  const [stepIndex, setStepIndex] = useState(() =>
    Math.min(initialStepIndex, Math.max(0, content.steps.length - 1))
  )
  const [phase, setPhase] = useState<Phase>('lesson')
  const [exitDialogOpen, setExitDialogOpen] = useState(false)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)

  useEffect(() => {
    const max = Math.max(0, content.steps.length - 1)
    setStepIndex(Math.min(Math.max(0, initialStepIndex), max))
    setPhase('lesson')
  }, [content.lessonId, content.steps.length, initialStepIndex])

  const totalSteps = content.steps.length
  const isFirst = stepIndex === 0
  const isLast = stepIndex === totalSteps - 1
  const currentBlocks = content.steps[stepIndex].blocks

  function handleBack() {
    if (!isFirst) {
      const next = stepIndex - 1
      setStepIndex(next)
      void onStepChange?.(next)
    }
  }

  function handleNext() {
    if (isLast) {
      setPhase('complete')
    } else {
      const next = stepIndex + 1
      setStepIndex(next)
      void onStepChange?.(next)
    }
  }

  /**
   * Persists completion then either opens the streak celebration (first activity today) or exits the flow.
   */
  async function handleFeedbackContinue() {
    const { showDayStreak } = await onAfterFeedbackCommit()
    if (showDayStreak) {
      setPhase('streak')
      return
    }
    onFinish()
  }

  // Post-lesson screens
  if (phase === 'complete') {
    return (
      <LessonCompleteScreen
        lessonLabel={lessonLabel}
        onContinue={handleFeedbackContinue}
      />
    )
  }

  if (phase === 'streak') {
    return <DayStreakScreen onContinue={onFinish} />
  }

  // Main lesson view — lesson content only (course map lives in the lesson shell layout).
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      {/* Exit confirmation dialog */}
      <Dialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <DialogContent className="max-w-sm p-6" hideClose>
          <div className="flex flex-col items-center text-center">
            <span className="mb-4 text-5xl">💔</span>
            <DialogTitle className="text-lg font-bold">
              Are you sure you want to end the lesson?
            </DialogTitle>
            <DialogDescription className="mt-1.5">
              Step progress is saved as you go. You can resume anytime from your
              course outline.
            </DialogDescription>
            <Button
              onClick={() => setExitDialogOpen(false)}
              size="xl"
              className="mt-5 w-full"
            >
              Continue learning
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setExitDialogOpen(false)
                onClose()
              }}
              size="xl"
              className="mt-2 w-full"
            >
              Exit now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <LessonIssueReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        lessonId={content.lessonId}
        lessonLabel={lessonLabel}
        stepIndex={stepIndex}
        stepCount={totalSteps}
      />
      <LessonAssistantWidget
        lessonLabel={lessonLabel}
        stepIndex={stepIndex}
        stepCount={totalSteps}
        blocks={currentBlocks}
      />

      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border/70 bg-background/95 px-2.5 py-2 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/80 sm:px-3">
        <Button
          variant="ghost"
          size="sm-icon"
          className="size-7"
          onClick={() => setExitDialogOpen(true)}
          title="Exit lesson"
        >
          <X className="size-4" />
        </Button>

        {/* Segmented progress bar */}
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <div className="flex w-full items-center gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-all duration-500',
                  i <= stepIndex
                    ? 'bg-gradient-to-r from-primary to-orange-400 shadow-sm shadow-primary/25'
                    : 'bg-muted'
                )}
              />
            ))}
          </div>
          <p className="rounded-full border border-primary/20 bg-primary/10 px-3 py-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-primary shadow-sm">
            Step {stepIndex + 1} of {totalSteps}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm-icon"
          className="size-7 text-muted-foreground hover:text-foreground"
          onClick={() => setReportDialogOpen(true)}
          title="Report content issue"
        >
          <Flag className="size-4" />
        </Button>
      </div>

      {/* Scrollable content — subtle panel so the lesson reads as a distinct surface */}
      <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="flex flex-col gap-0 rounded-2xl border border-border/50 bg-card/40 px-4 py-6 shadow-sm ring-1 ring-black/[0.03] sm:px-8 sm:py-8 dark:ring-white/[0.06]">
          {renderBlocks(currentBlocks, {
            lessonId: content.lessonId,
            stepIndex,
          })}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="sticky bottom-0 z-10 border-t border-border/60 bg-background/85 px-3 py-2.5 shadow-[0_-6px_20px_-16px_rgba(0,0,0,0.2)] backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2">
          {!isFirst ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-lg px-4"
                onClick={handleBack}
              >
                Back
              </Button>
              <div className="flex-1" />
              <Button
                size="sm"
                onClick={handleNext}
                className="h-9 rounded-lg px-6 shadow-sm"
              >
                {isLast ? 'Finish' : 'Continue'}
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={handleNext}
              className="h-9 w-full rounded-lg shadow-sm"
            >
              Continue
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Resolves a YouTube page or short link to a standard embed URL for an iframe.
 */
function youtubeEmbedSrc(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0]
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtube-nocookie.com'
    ) {
      const v = u.searchParams.get('v')
      if (v) return `https://www.youtube.com/embed/${v}`
      const embed = u.pathname.match(/\/embed\/([^/?]+)/)
      if (embed) return `https://www.youtube.com/embed/${embed[1]}`
      const shorts = u.pathname.match(/\/shorts\/([^/?]+)/)
      if (shorts) return `https://www.youtube.com/embed/${shorts[1]}`
    }
  } catch {
    /* ignore */
  }
  return null
}

/**
 * Resolves a Vimeo watch URL to the player iframe src.
 */
function vimeoEmbedSrc(url: string): string | null {
  try {
    const u = new URL(url)
    if (!u.hostname.includes('vimeo.com')) return null
    const m = u.pathname.match(/\/(?:video\/)?(\d+)/)
    return m ? `https://player.vimeo.com/video/${m[1]}` : null
  } catch {
    return null
  }
}

/**
 * Chooses iframe embed vs native HTML5 video for a lesson video block.
 */
function videoPresentation(
  src: string
): { mode: 'iframe'; href: string } | { mode: 'video'; href: string } | null {
  const t = src.trim()
  if (!t) return null
  const yt = youtubeEmbedSrc(t)
  if (yt) return { mode: 'iframe', href: yt }
  const vm = vimeoEmbedSrc(t)
  if (vm) return { mode: 'iframe', href: vm }
  return { mode: 'video', href: t }
}

type BlockContext = { lessonId: number; stepIndex: number }

/**
 * Renders text content with blank lines as paragraph breaks, preserving intentional line breaks.
 */
function renderTextParagraphs(
  keyPrefix: string,
  runs: Array<{ content: string; bold: boolean }>
): React.ReactNode[] {
  const groups: Array<Array<{ content: string; bold: boolean }>> = [[]]

  for (const run of runs) {
    const parts = run.content.split(/(\r?\n\s*\r?\n)/)
    for (const part of parts) {
      if (!part) continue
      if (/\r?\n\s*\r?\n/.test(part)) {
        groups.push([])
        continue
      }
      groups[groups.length - 1]!.push({ ...run, content: part })
    }
  }

  return groups
    .filter((group) => group.some((run) => run.content.trim().length > 0))
    .map((group, idx) => (
      <p
        key={`${keyPrefix}-${idx}`}
        className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed first:mt-0"
      >
        {group.map((run, runIdx) =>
          run.bold ? (
            <strong key={runIdx} className="font-semibold">
              {renderLinkedText(run.content, `${keyPrefix}-${idx}-${runIdx}`)}
            </strong>
          ) : (
            <span key={runIdx}>
              {renderLinkedText(run.content, `${keyPrefix}-${idx}-${runIdx}`)}
            </span>
          )
        )}
      </p>
    ))
}

/**
 * Renders ordered lesson blocks (headings, media, chat bubbles, etc.) for the current step.
 */
function renderBlocks(blocks: LessonBlock[], ctx: BlockContext) {
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < blocks.length) {
    const block = blocks[i]

    if (block.type === 'heading') {
      elements.push(
        <h2
          key={`h-${i}`}
          className="mt-8 border-b border-border/60 pb-2 text-2xl font-bold tracking-tight text-foreground first:mt-0"
        >
          {block.content}
        </h2>
      )
      i++
      continue
    }

    if (block.type === 'image') {
      elements.push(
        <div
          key={`img-${i}`}
          className="mt-4 overflow-hidden rounded-2xl bg-muted/40"
        >
          <img
            src={block.src}
            alt={block.alt ?? ''}
            className="h-auto w-full object-cover"
          />
        </div>
      )
      i++
      continue
    }

    if (block.type === 'video') {
      const pres = videoPresentation(block.src)
      elements.push(
        <div key={`vid-${i}`} className="mt-5 space-y-2 first:mt-0">
          {block.title ? (
            <p className="text-sm font-semibold text-foreground">{block.title}</p>
          ) : null}
          {pres ? (
            pres.mode === 'iframe' ? (
              <div className="aspect-video overflow-hidden rounded-2xl bg-muted/40">
                <iframe
                  title={block.title ?? 'Video'}
                  src={pres.href}
                  className="h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            ) : (
              <video
                controls
                className="mt-1 w-full rounded-2xl bg-black"
                src={pres.href}
              />
            )
          ) : (
            <p className="text-sm text-muted-foreground">Video URL missing.</p>
          )}
          {block.caption ? (
            <p className="text-xs text-muted-foreground">{block.caption}</p>
          ) : null}
        </div>
      )
      i++
      continue
    }

    if (block.type === 'file') {
      elements.push(
        <a
          key={`file-${i}`}
          href={block.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-5 flex items-start gap-3 rounded-2xl border border-blue-500/70 bg-zinc-950 px-4 py-3 text-left text-zinc-50 no-underline shadow-sm transition-colors hover:border-blue-400 hover:bg-zinc-900 first:mt-0"
        >
          <FileText className="mt-0.5 size-5 shrink-0 text-blue-300" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold leading-snug">{block.label}</span>
            {block.description ? (
              <span className="mt-1 block text-xs leading-relaxed text-zinc-400">
                {block.description}
              </span>
            ) : null}
            <span className="mt-2 flex min-w-0 items-center gap-2 text-xs font-semibold text-blue-300">
              <ExternalLink className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate underline decoration-blue-300/60 underline-offset-4 group-hover:decoration-blue-200">
                {block.url}
              </span>
            </span>
          </span>
        </a>
      )
      i++
      continue
    }

    if (
      block.type === 'quiz' ||
      block.type === 'quiz-single' ||
      block.type === 'quiz-multi'
    ) {
      elements.push(
        <QuizBlockView
          key={`quiz-${i}`}
          lessonId={ctx.lessonId}
          stepIndex={ctx.stepIndex}
          blockIndex={i}
          block={block}
        />
      )
      i++
      continue
    }

    if (block.type === 'submission') {
      elements.push(
        <SubmissionBlockView key={`sub-${i}`} lessonId={ctx.lessonId} block={block} />
      )
      i++
      continue
    }

    if (block.type === 'callout') {
      elements.push(<CalloutBlockView key={`callout-${i}`} block={block} />)
      i++
      continue
    }

    if (block.type === 'prompt') {
      elements.push(<PromptBlockView key={`prompt-${i}`} block={block} />)
      i++
      continue
    }

    // Merge consecutive text/bold-text into a single <p>
    if (block.type === 'text' || block.type === 'bold-text') {
      const textRuns: Array<{ content: string; bold: boolean }> = []
      let j = i
      while (
        j < blocks.length &&
        (blocks[j].type === 'text' || blocks[j].type === 'bold-text')
      ) {
        const b = blocks[j]
        if (b.type === 'bold-text') {
          textRuns.push({ content: b.content, bold: true })
        } else if (b.type === 'text') {
          textRuns.push({ content: b.content, bold: false })
        }
        j++
      }
      elements.push(
        <div key={`p-${i}`} className="mt-5 first:mt-0">
          {renderTextParagraphs(`p-${i}`, textRuns)}
        </div>
      )
      i = j
      continue
    }

    if (block.type === 'list') {
      elements.push(
        <ul
          key={`list-${i}`}
          className="ml-6 mt-4 flex list-disc flex-col gap-1.5"
        >
          {block.items.map((item, idx) => (
            <li key={idx} className="text-[15px] leading-relaxed">
              {renderLinkedText(item, `list-${i}-${idx}`)}
            </li>
          ))}
        </ul>
      )
      i++
      continue
    }

    if (block.type === 'user-message') {
      elements.push(
        <div
          key={`user-${i}`}
          className="mt-8 flex flex-col items-end gap-1.5"
        >
          <span className="text-xs text-muted-foreground">{block.name}</span>
          <div className="flex items-end gap-2.5">
            <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-[15px] leading-relaxed text-primary-foreground">
              {block.text}
            </div>
            <Avatar className="size-9 shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-violet-400 to-fuchsia-400 text-xs font-semibold text-white">
                {block.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      )
      i++
      continue
    }

    if (block.type === 'mentor-message') {
      elements.push(
        <div
          key={`mentor-${i}`}
          className="mt-5 flex flex-col items-start gap-1.5"
        >
          <span className="text-xs text-muted-foreground">Mentor</span>
          <div className="flex items-end gap-2.5">
            <Avatar className="size-9 shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-400 text-xs font-semibold text-white">
                M
              </AvatarFallback>
            </Avatar>
            <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-muted px-4 py-3 text-[15px] leading-relaxed">
              {renderLinkedText(block.text, `mentor-${i}`)}
            </div>
          </div>
        </div>
      )
      i++
      continue
    }

    i++
  }

  return elements
}
