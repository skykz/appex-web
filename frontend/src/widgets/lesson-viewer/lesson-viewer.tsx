import type React from 'react'
import { useState, useEffect } from 'react'
import { FileText, X } from 'lucide-react'
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
  QuizBlockView,
  SubmissionBlockView,
} from './lesson-interactive-blocks'

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

      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border/80 bg-background/90 px-3 py-3 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/75 sm:gap-4 sm:px-4">
        <Button
          variant="ghost"
          size="sm-icon"
          onClick={() => setExitDialogOpen(true)}
        >
          <X className="size-5" />
        </Button>

        {/* Segmented progress bar */}
        <div className="flex min-w-0 flex-1 items-center gap-1">
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
      <div className="sticky bottom-0 z-10 border-t border-border/80 bg-background/95 px-4 py-4 shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.08)] backdrop-blur-md supports-[backdrop-filter]:bg-background/85 dark:shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.35)]">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-1 sm:px-2">
          {!isFirst ? (
            <>
              <Button
                variant="outline"
                size="xl"
                onClick={handleBack}
              >
                Back
              </Button>
              <div className="flex-1" />
              <Button
                size="xl"
                onClick={handleNext}
                className="px-10"
              >
                {isLast ? 'Finish' : 'Continue'}
              </Button>
            </>
          ) : (
            <Button
              size="xl"
              onClick={handleNext}
              className="w-full"
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
          className="mt-5 flex items-start gap-3 rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-left text-zinc-50 no-underline shadow-sm transition-colors hover:bg-zinc-900 first:mt-0"
        >
          <FileText className="mt-0.5 size-5 shrink-0 text-zinc-400" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold leading-snug">{block.label}</span>
            {block.description ? (
              <span className="mt-1 block text-xs leading-relaxed text-zinc-400">
                {block.description}
              </span>
            ) : null}
            <span className="mt-1.5 block truncate text-xs text-zinc-500">{block.url}</span>
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

    // Merge consecutive text/bold-text into a single <p>
    if (block.type === 'text' || block.type === 'bold-text') {
      const spans: React.ReactNode[] = []
      let j = i
      while (
        j < blocks.length &&
        (blocks[j].type === 'text' || blocks[j].type === 'bold-text')
      ) {
        const b = blocks[j]
        if (b.type === 'bold-text') {
          spans.push(
            <strong key={j} className="font-semibold">
              {b.content}
            </strong>
          )
        } else if (b.type === 'text') {
          spans.push(<span key={j}>{b.content}</span>)
        }
        j++
      }
      elements.push(
        <p
          key={`p-${i}`}
          className="mt-5 text-[15px] leading-relaxed first:mt-0"
        >
          {spans}
        </p>
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
              {item}
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
              {block.text}
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
