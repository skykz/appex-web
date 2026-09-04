import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Check, ChevronDown, Copy, ExternalLink, FileText, Flag, Maximize2, Minimize2, PanelRightClose, PanelRightOpen, Paperclip, RotateCcw, Sparkles, X } from 'lucide-react'
import { LessonFileDownloadCard } from './lesson-file-download-card'
import { LessonLinkCard } from './lesson-link-card'
import { cn } from '@shared/lib'
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@shared/ui'
import { type LessonContent, type LessonBlock } from './lesson-types'
import type { SavedQuizAttempt } from './api'
import { LessonCompleteScreen } from './lesson-complete-screen'
import { ModuleCompleteScreen } from './module-complete-screen'
import { DayStreakScreen } from './day-streak-screen'
import {
  CalloutBlockView,
  PromptBlockView,
  QuizBlockView,
  SubmissionBlockView,
} from './lesson-interactive-blocks'
import { LessonIssueReportDialog } from './lesson-issue-report-dialog'
import { LessonAssistantWidget } from './lesson-assistant-widget'
import { LessonImageBlock } from './lesson-image-block'
import { renderLinkedText } from './render-linked-text'
import { MentorMessageBlock, UserMessageBlock } from './lesson-chat-message-blocks'

type Phase = 'lesson' | 'complete' | 'streak'

interface LessonViewerProps {
  content: LessonContent
  /** Latest saved quiz results keyed by step/block for resume UI. */
  quizAttempts?: SavedQuizAttempt[]
  /** Shown in the header and completion screens (e.g. lesson label from CMS). */
  lessonLabel?: string
  /** When set, the last step shows module completion instead of lesson completion. */
  moduleCompletion?: {
    moduleLabel: string
    moduleTitle?: string
  } | null
  /** Restores the learner to their last saved step when opening an in-progress lesson. */
  initialStepIndex?: number
  /** When true, the step bar reflects full lesson completion while the learner reviews from step 1. */
  lessonCompleted?: boolean
  /** Persists step index to the server when the learner moves between steps. */
  onStepChange?: (stepIndex: number) => void | Promise<void>
  onClose: () => void
  /** Called after the feedback step; navigate or invalidate here (keep fast — no heavy awaits). */
  onFinish: () => void
  /**
   * After the learner confirms the feedback screen: mark lesson complete and check streak.
   * Return `showDayStreak: true` only for the first streak activity of the day to show the celebration screen.
   */
  onAfterFeedbackCommit: (feedback?: {
    rating?: number
    feedback?: string
  }) => Promise<{ showDayStreak: boolean }>
}

export function LessonViewer({
  content,
  quizAttempts = [],
  lessonLabel = '',
  moduleCompletion = null,
  initialStepIndex = 0,
  lessonCompleted = false,
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
  /** blockIndex -> whether that quiz on the current step has a submitted answer. */
  const [quizAnswered, setQuizAnswered] = useState<Record<number, boolean>>({})

  useEffect(() => {
    const max = Math.max(0, content.steps.length - 1)
    setStepIndex(Math.min(Math.max(0, initialStepIndex), max))
    setPhase('lesson')
  }, [content.lessonId, content.steps.length, initialStepIndex])

  /** Stable callback each quiz block uses to report its answered state. */
  const handleQuizAnsweredChange = useCallback(
    (blockIndex: number, answered: boolean) => {
      setQuizAnswered((prev) =>
        prev[blockIndex] === answered ? prev : { ...prev, [blockIndex]: answered }
      )
    },
    []
  )

  /** Move to another step, clearing quiz-answered tracking for the step we leave. */
  function goToStep(next: number) {
    setQuizAnswered({})
    setStepIndex(next)
    void onStepChange?.(next)
  }

  // Defensive: a lesson with no steps would crash on content.steps[stepIndex].
  // Pages guard this too, but guard here so the viewer never indexes an empty array.
  if (!content.steps.length) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
        <p className="text-muted-foreground text-sm">
          This lesson has no content yet.
        </p>
      </div>
    )
  }

  const totalSteps = content.steps.length
  const isFirst = stepIndex === 0
  const isLast = stepIndex === totalSteps - 1
  const currentStep = content.steps[Math.min(stepIndex, totalSteps - 1)]
  const currentBlocks = currentStep?.blocks ?? []
  /** Completed lessons are review/retake mode — do not restore prior quiz results. */
  const quizAttemptMap = buildQuizAttemptMap(lessonCompleted ? [] : quizAttempts)

  /**
   * Block indices of quizzes on the current step. Continue is gated on these being answered
   * (in review mode for a completed lesson there's nothing to gate — the learner already passed).
   * Cheap to compute inline per render (a step has only a handful of blocks).
   */
  const quizBlockIndices = lessonCompleted
    ? []
    : currentBlocks
        .map((block, idx) => (isQuizBlock(block) ? idx : -1))
        .filter((idx) => idx >= 0)

  /** A step is answered when every quiz on it has a submitted answer (live or restored). */
  const hasUnansweredQuiz = quizBlockIndices.some((idx) => {
    const restored = quizAttemptMap.has(`${stepIndex}:${idx}`)
    return !restored && !quizAnswered[idx]
  })

  function handleBack() {
    if (!isFirst) {
      goToStep(stepIndex - 1)
    }
  }

  function handleNext() {
    // Guard: don't advance while a quiz on this step is unanswered.
    if (hasUnansweredQuiz) return
    if (isLast) {
      setPhase('complete')
    } else {
      goToStep(stepIndex + 1)
    }
  }

  /**
   * Persists completion then either opens the streak celebration (first activity today) or exits the flow.
   * Feedback/streak persistence is best-effort: if it fails, the learner is still advanced so a
   * network hiccup never traps them on the completion screen (Continue/Skip must always work).
   */
  async function handleFeedbackContinue(feedback?: { rating?: number; feedback?: string }) {
    try {
      const { showDayStreak } = await onAfterFeedbackCommit(feedback)
      if (showDayStreak) {
        setPhase('streak')
        return
      }
    } catch (err) {
      console.error('Failed to save lesson completion/feedback; advancing anyway.', err)
    }
    onFinish()
  }

  // Post-lesson screens
  if (phase === 'complete') {
    if (moduleCompletion) {
      return (
        <ModuleCompleteScreen
          moduleLabel={moduleCompletion.moduleLabel}
          moduleTitle={moduleCompletion.moduleTitle}
          onContinue={handleFeedbackContinue}
        />
      )
    }

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
        // Only known for the final lesson of a module; Lexi omits it when absent.
        moduleLabel={moduleCompletion?.moduleLabel}
        stepIndex={stepIndex}
        stepCount={totalSteps}
        blocks={currentBlocks}
      />

      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border/70 bg-background/95 px-2.5 py-2 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/80 sm:px-3">
        <Button
          variant="ghost"
          size="sm-icon"
          className="size-9"
          onClick={() => setExitDialogOpen(true)}
          title="Exit lesson"
        >
          <X className="size-5" />
        </Button>

        {/* Segmented progress bar */}
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <div className="flex w-full items-center gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-all duration-500',
                  lessonCompleted || i <= stepIndex
                    ? 'bg-linear-to-r from-primary to-orange-400 shadow-sm shadow-primary/25'
                    : 'bg-muted'
                )}
              />
            ))}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm-icon"
          className="size-9 text-muted-foreground hover:text-foreground"
          onClick={() => setReportDialogOpen(true)}
          title="Report content issue"
        >
          <Flag className="size-4" />
        </Button>
      </div>

      {/* Scrollable content — subtle panel so the lesson reads as a distinct surface.
          Extra bottom padding keeps the last lines clear of the floating Lexi bubble. */}
      <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 pt-6 pb-24 sm:px-8">
        <div className="flex flex-col gap-0 rounded-2xl border border-border/50 bg-card/40 px-3 py-6 shadow-sm ring-1 ring-black/[0.03] sm:px-8 sm:py-8 dark:ring-white/[0.06]">
          {renderBlocks(currentBlocks, {
            lessonId: content.lessonId,
            stepIndex,
            quizAttemptMap,
            onQuizAnsweredChange: handleQuizAnsweredChange,
          })}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="sticky bottom-0 z-10 border-t border-border/60 bg-background/85 px-3 py-2.5 shadow-[0_-6px_20px_-16px_rgba(0,0,0,0.2)] backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto w-full max-w-3xl">
          {hasUnansweredQuiz ? (
            <p className="mb-2 text-center text-xs font-medium text-muted-foreground">
              Answer the question above to continue.
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 rounded-lg px-4" onClick={handleBack} disabled={isFirst}>Back</Button>
            <div className="flex-1" />
            <Button size="sm" onClick={handleNext} disabled={hasUnansweredQuiz} className="h-9 rounded-lg px-6 shadow-sm">{isLast ? 'Finish' : 'Continue'}</Button>
          </div>
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

type BlockContext = {
  lessonId: number
  stepIndex: number
  quizAttemptMap: Map<string, SavedQuizAttempt>
  onQuizAnsweredChange?: (blockIndex: number, answered: boolean) => void
}

/** True for any interactive quiz block variant. */
function isQuizBlock(block: LessonBlock): boolean {
  return (
    block.type === 'quiz' ||
    block.type === 'quiz-single' ||
    block.type === 'quiz-multi'
  )
}

/**
 * Indexes saved quiz attempts by `stepIndex:blockIndex` for fast lookup while rendering blocks.
 */
function buildQuizAttemptMap(attempts: SavedQuizAttempt[]): Map<string, SavedQuizAttempt> {
  const map = new Map<string, SavedQuizAttempt>()
  for (const attempt of attempts) {
    map.set(`${attempt.stepIndex}:${attempt.blockIndex}`, attempt)
  }
  return map
}

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
      elements.push(<LessonImageBlock key={`img-${i}`} src={block.src} alt={block.alt} />)
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
              <div className="aspect-video overflow-hidden rounded-2xl border border-border/80 bg-muted/40 p-1.5 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                <iframe
                  title={block.title ?? 'Video'}
                  src={pres.href}
                  className="h-full w-full rounded-xl border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            ) : (
              <video
                controls
                className="mt-1 max-h-[70vh] w-full rounded-2xl border border-border/80 bg-black p-1.5 shadow-sm ring-1 ring-black/5 dark:ring-white/10"
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
        <LessonFileDownloadCard
          key={`file-${i}`}
          url={block.url}
          label={block.label}
          description={block.description}
        />
      )
      i++
      continue
    }

    if (block.type === 'link') {
      elements.push(
        <LessonLinkCard
          key={`link-${i}`}
          url={block.url}
          label={block.label}
          description={block.description}
        />
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
          key={`quiz-${ctx.stepIndex}-${i}`}
          lessonId={ctx.lessonId}
          stepIndex={ctx.stepIndex}
          blockIndex={i}
          block={block}
          restoredAttempt={ctx.quizAttemptMap.get(`${ctx.stepIndex}:${i}`) ?? null}
          onAnsweredChange={ctx.onQuizAnsweredChange}
        />
      )
      i++
      continue
    }

    if (block.type === 'submission') {
      elements.push(
        <SubmissionBlockView
          key={`sub-${ctx.stepIndex}-${i}`}
          lessonId={ctx.lessonId}
          block={block}
        />
      )
      i++
      continue
    }

    if (block.type === 'callout') {
      elements.push(<CalloutBlockView key={`callout-${i}`} block={block} />)
      i++
      continue
    }

    if (block.type === 'table') {
      elements.push(<InteractiveTableBlock key={`table-${i}`} block={block} />)
      i++
      continue
    }

    if (block.type === 'guide') {
      elements.push(<GuideBlock key={`guide-${i}`} block={block} />)
      i++
      continue
    }

    if (block.type === 'playground') {
      elements.push(<PlaygroundBlock key={`playground-${ctx.stepIndex}-${i}`} block={block} />)
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
      elements.push(block.checkable ? (
        <ChecklistBlock key={`list-${i}`} block={block} />
      ) : (
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
      ))
      i++
      continue
    }

    if (block.type === 'user-message') {
      elements.push(
        <UserMessageBlock key={`user-${i}`} name={block.name}>
          {block.text}
        </UserMessageBlock>
      )
      i++
      continue
    }

    if (block.type === 'mentor-message') {
      elements.push(
        <MentorMessageBlock key={`mentor-${i}`}>
          {renderLinkedText(block.text, `mentor-${i}`)}
        </MentorMessageBlock>
      )
      i++
      continue
    }

    i++
  }

  return elements
}

function ChecklistBlock({ block }: { block: Extract<LessonBlock, { type: 'list' }> }) {
  const [checked, setChecked] = useState<Set<number>>(() => new Set())
  return (
    <ul className="mt-4 flex flex-col gap-2" aria-label="Checklist">
      {block.items.map((item, index) => {
        const isChecked = checked.has(index)
        return <li key={index}>
          <label className="flex cursor-pointer items-start gap-3 py-1.5">
            <input type="checkbox" checked={isChecked} onChange={() => setChecked((current) => { const next = new Set(current); if (next.has(index)) next.delete(index); else next.add(index); return next })} className="mt-0.5 size-4 shrink-0 accent-primary" />
            <span className={cn('text-[15px] leading-relaxed', isChecked && 'line-through decoration-foreground/50')}>{renderLinkedText(item, `checklist-${index}`)}</span>
          </label>
        </li>
      })}
    </ul>
  )
}

function InteractiveTableBlock({ block }: { block: Extract<LessonBlock, { type: 'table' }> }) {
  const [active, setActive] = useState(0)
  const item = block.items[active]
  const evenlySpaced = block.items.length >= 2 && block.items.length <= 4
  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm first:mt-0">
      {block.title ? <h3 className="border-b border-border/70 px-4 py-3 font-semibold">{block.title}</h3> : null}
      <div className={cn('bg-muted/30 px-2 pt-2', evenlySpaced ? 'grid gap-1.5' : 'flex gap-1 overflow-x-auto')} style={evenlySpaced ? { gridTemplateColumns: `repeat(${block.items.length}, minmax(0, 1fr))` } : undefined} role="tablist">
        {block.items.map((entry, index) => <button key={index} type="button" role="tab" aria-selected={index === active} onClick={() => setActive(index)} className={cn('relative whitespace-nowrap px-3 py-2.5 text-center text-sm font-semibold transition-all', index === active ? 'z-10 -mb-px rounded-t-xl border border-b-0 border-primary/40 bg-card text-primary shadow-[0_-3px_10px_-8px_rgba(0,0,0,0.4)] after:absolute after:-bottom-1 after:inset-x-0 after:h-1 after:bg-card' : 'rounded-t-lg text-muted-foreground hover:bg-background/70 hover:text-foreground')}>{entry.label}</button>)}
      </div>
      {item ? <div role="tabpanel" className="min-h-20 border-t border-primary/40 bg-card px-5 py-4 text-center text-[15px] leading-relaxed"><div className="mx-auto max-w-2xl whitespace-pre-wrap">{renderLinkedText(item.content, `table-${active}`)}</div></div> : null}
    </section>
  )
}

function GuideBlock({ block }: { block: Extract<LessonBlock, { type: 'guide' }> }) {
  const [current, setCurrent] = useState(0)
  const isFirst = current === 0
  const isLast = current === block.steps.length - 1
  return <section className="mt-5 rounded-2xl bg-muted/35 px-5 py-5 first:mt-0 sm:px-6">
    <p className="text-sm font-semibold text-muted-foreground">{block.title || 'Guide'}</p>
    {block.description ? <div className="mt-5 whitespace-pre-wrap text-[15px] leading-7 text-foreground">{renderLinkedText(block.description, 'guide-description')}</div> : null}
    <ol className="mt-5">
      {block.steps.map((guideStep, index) => {
        const active = index === current
        const last = index === block.steps.length - 1
        return <li key={index} className="relative grid grid-cols-[2rem_1fr] gap-x-2.5 pb-5 last:pb-0">
          {!last ? <span className="absolute left-[0.9375rem] top-7 h-[calc(100%-1rem)] w-px bg-border" aria-hidden /> : null}
          <span className={cn('relative z-10 flex size-7 items-center justify-center rounded-full text-sm font-medium transition-colors', active ? 'bg-primary/15 text-primary ring-1 ring-primary/20' : 'bg-muted text-muted-foreground')}>{index + 1}</span>
          <div className="min-w-0 pt-0.5">
            <p className={cn('text-[15px] font-semibold leading-6', active ? 'text-foreground' : 'text-muted-foreground')}>{guideStep.title}</p>
            {active ? <div className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-foreground/90">{renderLinkedText(guideStep.content, `guide-${current}`)}</div> : null}
          </div>
        </li>
      })}
    </ol>
    <div className="mt-5 flex items-center">
      <Button type="button" variant="outline" size="sm" disabled={isFirst} onClick={() => setCurrent((value) => Math.max(0, value - 1))}>Back</Button>
      <div className="flex-1" />
      <Button type="button" size="sm" disabled={isLast} onClick={() => setCurrent((value) => Math.min(block.steps.length - 1, value + 1))}>Next</Button>
    </div>
  </section>
}

function fileExtension(url: string): string {
  try {
    return new URL(url).pathname.split('.').pop()?.toLowerCase() ?? ''
  } catch {
    return url.split('?')[0].split('.').pop()?.toLowerCase() ?? ''
  }
}

function PlaygroundFilePreview({ url, label }: { url: string; label: string }) {
  const extension = fileExtension(url)
  const isImage = ['gif', 'jpeg', 'jpg', 'png', 'webp'].includes(extension)
  const isHtml = extension === 'html' || extension === 'htm'
  const isOfficeDocument = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(extension)
  const isTextFile = ['csv', 'htm', 'html', 'json', 'md', 'markdown', 'txt'].includes(extension)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [textFailed, setTextFailed] = useState(false)

  useEffect(() => {
    if (!isTextFile) return
    let active = true
    setTextContent(null)
    setTextFailed(false)
    void fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error('Could not load file preview')
        return response.text()
      })
      .then((source) => active && setTextContent(source))
      .catch(() => active && setTextFailed(true))
    return () => {
      active = false
    }
  }, [isTextFile, url])

  if (isImage) {
    return <div className="flex size-full items-center justify-center p-4"><img src={url} alt={label} className="max-h-full max-w-full object-contain" /></div>
  }

  if (isTextFile) {
    if (textFailed) {
      return <div className="flex min-h-80 items-center justify-center px-6 text-sm text-muted-foreground">This file could not be previewed.</div>
    }
    if (textContent === null) {
      return <div className="flex min-h-80 items-center justify-center px-6 text-sm text-muted-foreground">Loading file preview…</div>
    }
    if (isHtml) {
      return <iframe title={label} srcDoc={textContent} className="size-full min-h-80 border-0 bg-white" sandbox="allow-scripts allow-forms allow-modals allow-popups" />
    }
    return <pre className="size-full min-h-80 overflow-auto whitespace-pre-wrap bg-white p-4 font-mono text-sm leading-6 text-foreground">{textContent}</pre>
  }

  const source = isOfficeDocument
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
    : url
  return (
    <iframe
      title={label}
      src={source}
      className="size-full min-h-80 border-0 bg-white"
      sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads"
    >
    </iframe>
  )
}

function PlaygroundBlock({ block }: { block: Extract<LessonBlock, { type: 'playground' }> }) {
  const [tab, setTab] = useState<'prompt' | 'chat'>('prompt')
  const [fullscreen, setFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [promptExpanded, setPromptExpanded] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [hasRun, setHasRun] = useState(false)
  const previewUrl = hasRun ? block.previewUrl : ''
  const previewLabel = block.previewLabel || 'Generated output'
  const hasFile = Boolean(previewUrl)
  async function copyPrompt() {
    try { await navigator.clipboard.writeText(block.prompt); setCopied(true); window.setTimeout(() => setCopied(false), 1800) } catch { /* clipboard can be unavailable */ }
  }
  async function runPlayground() {
    if (generating) return
    setTab('chat')
    setGenerating(true)
    setPreviewOpen(false)
    await new Promise((resolve) => window.setTimeout(resolve, 1100))
    setGenerating(false)
    setHasRun(true)
    setPreviewOpen(Boolean(block.previewUrl))
  }
  return <section className={cn('relative mt-5 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm first:mt-0', fullscreen && 'fixed inset-4 z-50 m-0 flex flex-col bg-background shadow-2xl')}>
    <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3.5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary/[0.09] text-primary"><Sparkles className="size-[18px]" aria-hidden /></span>
      <h3 className="min-w-0 flex-1 font-semibold text-foreground">{block.title || 'AI Playground'}</h3>
      <Button type="button" variant="ghost" size="icon" className="size-9 rounded-full" onClick={() => { setTab('prompt'); setGenerating(false); setHasRun(false); setPreviewOpen(false) }} aria-label="Reset playground"><RotateCcw className="size-4" /></Button>
      <Button type="button" variant="ghost" size="icon" className="size-9 rounded-full" onClick={() => setFullscreen((value) => !value)} aria-label={fullscreen ? 'Exit fullscreen' : 'Open fullscreen'}>{fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}</Button>
    </div>
    <div className={cn('grid lg:h-[34rem]', hasFile && previewOpen && 'lg:grid-cols-2', fullscreen && 'min-h-0 flex-1 overflow-hidden lg:h-auto')}>
      <div className="flex min-h-0 flex-col border-b border-border/70 lg:border-r lg:border-b-0">
        <div className="flex border-b border-border/70 bg-muted/20" role="tablist"><button type="button" role="tab" aria-selected={tab === 'prompt'} onClick={() => setTab('prompt')} className={cn('border-b-2 px-5 py-3 text-sm font-semibold', tab === 'prompt' ? 'border-primary bg-card text-foreground' : 'border-transparent text-muted-foreground')}>Prompt</button>{hasRun || generating ? <button type="button" role="tab" aria-selected={tab === 'chat'} onClick={() => setTab('chat')} className={cn('border-b-2 px-5 py-3 text-sm font-semibold', tab === 'chat' ? 'border-primary bg-card text-foreground' : 'border-transparent text-muted-foreground')}>Chat</button> : null}</div>
        <div className={cn('min-h-80 flex-1 overflow-y-auto px-4 py-5', tab === 'chat' && 'bg-muted/25')}>
          {tab === 'prompt' ? <pre className="mx-auto max-w-2xl whitespace-pre-wrap font-mono text-[14px] leading-7 text-foreground">{block.prompt}</pre> : <div className="mx-auto flex max-w-2xl flex-col gap-5">
            <div className="flex justify-end"><div className="flex max-w-[85%] flex-col items-end gap-2"><div className="w-full rounded-xl rounded-br-sm bg-muted p-3 shadow-sm"><div className="relative"><pre className={cn('whitespace-pre-wrap font-mono text-[14px] leading-7 text-foreground', !promptExpanded && 'line-clamp-6')}>{block.prompt}</pre>{!promptExpanded && block.prompt.length > 220 ? <span className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-b from-transparent to-muted" /> : null}</div>{block.prompt.length > 220 ? <button type="button" onClick={() => setPromptExpanded((value) => !value)} className="mt-2 flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 text-xs font-semibold text-foreground">{promptExpanded ? 'Show less' : 'Show more'}<ChevronDown className={cn('size-3.5 transition-transform', promptExpanded && 'rotate-180')} /></button> : null}</div>{block.documentUrl ? <a href={block.documentUrl} target="_blank" rel="noopener noreferrer" className="flex h-[58px] w-full min-w-64 items-center gap-3 rounded-xl border border-border/80 bg-card p-3 text-foreground shadow-sm"><span className="flex size-9 items-center justify-center rounded-lg bg-primary/[0.08] text-primary"><FileText className="size-5" /></span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{block.documentLabel || 'Input document'}</span><span className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold">View</span></a> : null}</div></div>
            {generating ? <div className="flex items-center gap-3 py-2 text-sm text-muted-foreground" role="status" aria-live="polite"><span className="flex items-center gap-1"><span className="size-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" /><span className="size-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" /><span className="size-2 animate-bounce rounded-full bg-primary" /></span><span>Claude is working…</span></div> : <div className="flex flex-col gap-3"><div className="whitespace-pre-wrap text-[15px] leading-7 text-foreground">{renderLinkedText(block.answer, 'playground-chat')}</div>{block.previewUrl ? <button type="button" onClick={() => setPreviewOpen(true)} className="flex h-[66px] items-center gap-3 rounded-xl border border-border/80 bg-card p-3 text-left text-foreground shadow-sm transition-colors hover:border-primary/40"><span className="flex size-10 items-center justify-center rounded-lg bg-primary/[0.08] text-primary"><FileText className="size-5" /></span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{block.previewLabel || 'Generated output'}</span><span className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold">View</span></button> : null}</div>}
          </div>}
        </div>
        {tab === 'prompt' && block.documentUrl ? <a href={block.documentUrl} target="_blank" rel="noopener noreferrer" className="mx-4 mb-4 flex items-center gap-2 rounded-xl border border-border/70 bg-muted/25 px-3 py-2.5 text-sm font-medium text-foreground hover:border-primary/30"><Paperclip className="size-4 text-primary" aria-hidden /><span className="min-w-0 flex-1 truncate">{block.documentLabel || 'Input document'}</span><span className="text-xs font-semibold text-primary">View</span><ExternalLink className="size-4 text-muted-foreground" aria-hidden /></a> : null}
        <div className="flex justify-end gap-2 border-t border-border/70 px-4 py-3"><Button type="button" variant="ghost" size="sm" onClick={() => void copyPrompt()} className="gap-2">{copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}{copied ? 'Copied' : 'Copy'}</Button><Button type="button" size="sm" disabled={generating} onClick={() => void runPlayground()} className="gap-2"><Sparkles className={cn('size-4', generating && 'animate-pulse')} />{generating ? 'Working…' : tab === 'chat' ? 'Regenerate' : 'Try it'}</Button></div>
      </div>
      {hasFile && previewOpen ? <div className="flex min-h-0 flex-col bg-muted/15">
        <div className="flex h-11 shrink-0 items-center border-b border-border/70 px-4"><p className="flex-1 text-sm font-semibold">Preview</p>{previewUrl ? <a href={previewUrl} target="_blank" rel="noopener noreferrer" aria-label="Open preview in new tab" className="mr-2 text-muted-foreground transition-colors hover:text-primary"><ExternalLink className="size-4" /></a> : null}<button type="button" onClick={() => setPreviewOpen(false)} aria-label="Collapse preview" className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-primary"><PanelRightClose className="size-4" /></button></div>
        <div className="min-h-80 flex-1 overflow-hidden">{previewUrl ? <PlaygroundFilePreview url={previewUrl} label={previewLabel} /> : <div className="flex size-full min-h-80 flex-col items-center justify-center px-6 text-center text-muted-foreground"><Paperclip className="mb-3 size-7 text-primary/50" /><p className="text-sm">A file preview appears here when the exercise uses an input or generated file.</p></div>}</div>
      </div> : hasFile ? <button type="button" onClick={() => setPreviewOpen(true)} aria-label="Open preview" className="absolute right-5 mt-3 flex size-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-primary"><PanelRightOpen className="size-4" /></button> : null}
    </div>
  </section>
}
