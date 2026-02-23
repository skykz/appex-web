import type React from 'react'
import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@shared/lib'
import {
  Avatar,
  AvatarFallback,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@shared/ui'
import { type LessonContent, type LessonBlock } from './mock-content'
import { LessonCompleteScreen } from './lesson-complete-screen'
import { DayStreakScreen } from './day-streak-screen'

type Phase = 'lesson' | 'complete' | 'streak'

interface LessonViewerProps {
  content: LessonContent
  lessonLabel?: string
  onClose: () => void
  onFinish: () => void
}

export function LessonViewer({
  content,
  lessonLabel = 'Lesson 1',
  onClose,
  onFinish,
}: LessonViewerProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('lesson')
  const [exitDialogOpen, setExitDialogOpen] = useState(false)

  const totalSteps = content.steps.length
  const isFirst = stepIndex === 0
  const isLast = stepIndex === totalSteps - 1
  const currentBlocks = content.steps[stepIndex].blocks

  function handleBack() {
    if (!isFirst) setStepIndex(stepIndex - 1)
  }

  function handleNext() {
    if (isLast) {
      setPhase('complete')
    } else {
      setStepIndex(stepIndex + 1)
    }
  }

  // Post-lesson screens
  if (phase === 'complete') {
    return (
      <LessonCompleteScreen
        lessonLabel={lessonLabel}
        onContinue={() => setPhase('streak')}
      />
    )
  }

  if (phase === 'streak') {
    return <DayStreakScreen onContinue={onFinish} />
  }

  // Main lesson view
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Exit confirmation dialog */}
      <Dialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <DialogContent className="max-w-sm p-6" hideClose>
          <div className="flex flex-col items-center text-center">
            <span className="mb-4 text-5xl">💔</span>
            <DialogTitle className="text-lg font-bold">
              Are you sure you want to end the lesson?
            </DialogTitle>
            <DialogDescription className="mt-1.5">
              Your progress won't be saved if you leave now
            </DialogDescription>
            <button
              type="button"
              onClick={() => setExitDialogOpen(false)}
              className="mt-5 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
            >
              Continue learning
            </button>
            <button
              type="button"
              onClick={() => {
                setExitDialogOpen(false)
                onClose()
              }}
              className="mt-2 w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-all hover:bg-muted active:scale-[0.98]"
            >
              Exit now
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center gap-4 border-b bg-background px-4 py-3">
        <button
          type="button"
          onClick={() => setExitDialogOpen(true)}
          className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-muted active:scale-95"
        >
          <X className="size-5" />
        </button>

        {/* Segmented progress bar */}
        <div className="flex flex-1 items-center gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-all duration-500',
                i <= stepIndex ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-4 py-6">
        <div className="flex flex-col gap-0">
          {renderBlocks(currentBlocks)}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="sticky bottom-0 border-t bg-background px-4 py-4">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
          {!isFirst ? (
            <>
              <button
                type="button"
                onClick={handleBack}
                className="rounded-xl border px-6 py-3 text-sm font-semibold transition-all hover:bg-muted active:scale-[0.98]"
              >
                Back
              </button>
              <div className="flex-1" />
              <button
                type="button"
                onClick={handleNext}
                className="rounded-xl bg-primary px-10 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
              >
                {isLast ? 'Finish' : 'Continue'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function renderBlocks(blocks: LessonBlock[]) {
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < blocks.length) {
    const block = blocks[i]

    if (block.type === 'heading') {
      elements.push(
        <h2 key={`h-${i}`} className="mt-6 text-xl font-bold first:mt-0">
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
        } else {
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
