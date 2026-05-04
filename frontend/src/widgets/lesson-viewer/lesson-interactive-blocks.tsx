import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@shared/lib'
import { Button, Input, Textarea } from '@shared/ui'
import type { LessonBlock } from './lesson-types'
import { lessonApi } from './api'

type QuizBlock =
  | Extract<LessonBlock, { type: 'quiz' }>
  | Extract<LessonBlock, { type: 'quiz-single' } | { type: 'quiz-multi' }>

/**
 * Derives single / multi / open behavior from a unified or legacy quiz block.
 */
function getQuizInteractionMode(block: QuizBlock): 'single' | 'multi' | 'open' {
  if (block.type === 'quiz') return block.mode
  if (block.type === 'quiz-single') return 'single'
  return 'multi'
}

/**
 * Choice options exist only for non–open-ended quiz shapes.
 */
function getQuizOptions(block: QuizBlock): string[] {
  if (block.type === 'quiz') {
    if (block.mode === 'open') return []
    return block.options
  }
  return block.options
}

const CORRECT_FEEDBACK = [
  'Nice — that\'s right!',
  'Correct!',
  'Exactly.',
  'You got it.',
  'Spot on!',
] as const

const INCORRECT_FEEDBACK = [
  'Not quite.',
  'Close, but not quite.',
  'That\'s not the strongest answer here.',
  'Good try — not this one.',
  'Almost — check the explanation below.',
] as const

const OPEN_THANKS = [
  'Thanks — your response was saved.',
  'Got it — we’ve recorded your answer.',
  'Recorded. Thanks for taking the time.',
] as const

/**
 * Picks a stable phrase from a list so feedback varies between blocks without flickering on re-render.
 */
function pickPhrase<T extends readonly string[]>(list: T, seed: number): T[number] {
  const i = Math.abs(seed) % list.length
  return list[i]!
}

/**
 * Renders an interactive quiz with server-side answer checking (correct answers are not shipped to the client).
 */
export function QuizBlockView({
  lessonId,
  stepIndex,
  blockIndex,
  block,
}: {
  lessonId: number
  stepIndex: number
  blockIndex: number
  block: QuizBlock
}) {
  const mode = getQuizInteractionMode(block)
  const [selected, setSelected] = useState<number[]>([])
  const [openText, setOpenText] = useState('')
  const [result, setResult] = useState<{
    correct: boolean
    explanation: string | null
  } | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      mode === 'open'
        ? lessonApi.checkQuiz(lessonId, {
            stepIndex,
            blockIndex,
            selectedIndices: [],
            openAnswer: openText.trim(),
          })
        : lessonApi.checkQuiz(lessonId, {
            stepIndex,
            blockIndex,
            selectedIndices: selected,
          }),
    onSuccess: (data) => setResult(data),
  })

  /**
   * Updates selection for choice-style questions (single clears others; multi toggles).
   */
  function toggle(idx: number) {
    if (mode === 'single') {
      setSelected([idx])
      return
    }
    setSelected((prev) =>
      prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx].sort((a, b) => a - b)
    )
  }

  const options = getQuizOptions(block)
  const feedbackSeed = stepIndex * 47 + blockIndex * 13

  const canSubmit =
    mode === 'open'
      ? openText.trim().length > 0
      : selected.length > 0 && (mode === 'multi' ? true : selected.length === 1)

  const summaryPhrase =
    result && mode === 'open'
      ? pickPhrase(OPEN_THANKS, feedbackSeed)
      : result && mode !== 'open'
        ? pickPhrase(
            result.correct ? CORRECT_FEEDBACK : INCORRECT_FEEDBACK,
            feedbackSeed
          )
        : null

  return (
    <div className="mt-5 rounded-2xl border-2 border-orange-100 bg-white p-4 shadow-sm ring-1 ring-orange-50 sm:p-5">
      <p className="text-base font-semibold leading-snug text-zinc-900">
        {block.question}
      </p>
      {mode === 'open' ? (
        <Textarea
          className="mt-3 min-h-[120px] border-2 border-zinc-200 bg-white text-zinc-900 focus-visible:border-primary"
          placeholder="Your answer…"
          value={openText}
          onChange={(e) => setOpenText(e.target.value)}
          disabled={mutation.isPending || result !== null}
        />
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {options.map((opt, idx) => {
            const isSelected = selected.includes(idx)
            const showOutcome = result !== null && isSelected

            return (
              <li key={idx}>
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  disabled={mutation.isPending || result !== null}
                  aria-pressed={isSelected}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-xl border-2 px-3 py-3 text-left text-[15px] leading-relaxed transition-all',
                    !isSelected &&
                      !showOutcome &&
                      'border-zinc-200 bg-white hover:border-orange-200 hover:bg-orange-50/50',
                    isSelected &&
                      !result &&
                      'border-primary bg-primary/[0.12] shadow-[inset_3px_0_0_0_hsl(var(--primary))] ring-2 ring-primary/25',
                    showOutcome &&
                      result?.correct &&
                      'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200',
                    showOutcome &&
                      !result?.correct &&
                      'border-amber-600 bg-amber-50 ring-2 ring-amber-200'
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold tabular-nums transition-colors',
                      !isSelected &&
                        'border-zinc-300 bg-zinc-50 text-zinc-700',
                      isSelected &&
                        !result &&
                        'border-primary bg-primary text-primary-foreground',
                      showOutcome &&
                        result?.correct &&
                        'border-emerald-600 bg-emerald-600 text-white',
                      showOutcome &&
                        !result?.correct &&
                        'border-amber-700 bg-amber-700 text-white'
                    )}
                  >
                    {isSelected ? (
                      <Check className="size-4" strokeWidth={3} aria-hidden />
                    ) : (
                      idx + 1
                    )}
                  </span>
                  <span
                    className={cn(
                      'min-w-0 flex-1 pt-0.5',
                      isSelected && !result && 'font-medium text-zinc-900'
                    )}
                  >
                    {opt}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap items-start gap-3">
        <Button
          type="button"
          size="sm"
          disabled={!canSubmit || mutation.isPending || result !== null}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? 'Checking…' : mode === 'open' ? 'Submit answer' : 'Check answer'}
        </Button>
        {result ? (
          <div
            className={cn(
              'flex min-h-9 items-center rounded-lg border-l-4 px-3 py-1.5 text-sm font-semibold',
              mode === 'open'
                ? 'border-sky-500 bg-sky-50 text-sky-950'
                : result.correct
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                  : 'border-amber-600 bg-amber-50 text-amber-950'
            )}
            role="status"
          >
            {summaryPhrase}
          </div>
        ) : null}
      </div>
      {result?.explanation ? (
        <p className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm leading-relaxed text-zinc-700">
          {result.explanation}
        </p>
      ) : null}
    </div>
  )
}

/**
 * Collects student text (and optional file URL) and posts it to the lesson submissions API.
 */
export function SubmissionBlockView({
  lessonId,
  block,
}: {
  lessonId: number
  block: Extract<LessonBlock, { type: 'submission' }>
}) {
  const qc = useQueryClient()
  const [message, setMessage] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState('')

  const { data: existing } = useQuery({
    queryKey: ['lesson-submission', lessonId],
    queryFn: () => lessonApi.getMySubmission(lessonId),
  })

  const submit = useMutation({
    mutationFn: () =>
      lessonApi.submitSubmission(lessonId, {
        message,
        attachmentUrl: attachmentUrl.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lesson-submission', lessonId] })
      setMessage('')
      setAttachmentUrl('')
    },
  })

  return (
    <div className="mt-5 rounded-2xl border border-sky-500/30 bg-sky-500/[0.06] p-4 ring-1 ring-sky-500/15">
      <p className="text-sm font-semibold text-foreground">{block.prompt}</p>
      <Textarea
        className="mt-3 min-h-[100px] border-border/80 bg-background"
        placeholder="Your answer or notes…"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={submit.isPending}
      />
      {block.acceptAttachment ? (
        <Input
          className="mt-2 border-border/80 bg-background"
          placeholder="Link to file (URL you uploaded elsewhere)"
          value={attachmentUrl}
          onChange={(e) => setAttachmentUrl(e.target.value)}
        />
      ) : null}
      <Button
        type="button"
        className="mt-3"
        size="sm"
        disabled={!message.trim() || submit.isPending}
        onClick={() => submit.mutate()}
      >
        {submit.isPending ? 'Sending…' : 'Submit work'}
      </Button>
      {existing ? (
        <div className="mt-4 rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm">
          <p className="text-xs font-medium text-muted-foreground">Latest submission</p>
          <p className="mt-1 whitespace-pre-wrap text-foreground">{existing.message}</p>
          {existing.admin_feedback ? (
            <p className="mt-2 border-t border-border/60 pt-2 text-muted-foreground">
              <span className="font-semibold text-foreground">Feedback: </span>
              {existing.admin_feedback}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

const calloutStyles = {
  tip: 'border-emerald-500/40 bg-emerald-500/[0.07] ring-emerald-500/20',
  note: 'border-sky-500/40 bg-sky-500/[0.07] ring-sky-500/20',
  warn: 'border-amber-500/50 bg-amber-500/[0.08] ring-amber-500/25',
} as const

/**
 * Highlighted callout panel for tips, notes, and warnings inside a lesson step.
 */
export function CalloutBlockView({
  block,
}: {
  block: Extract<LessonBlock, { type: 'callout' }>
}) {
  return (
    <div
      className={cn(
        'mt-5 rounded-2xl border p-4 shadow-sm ring-1',
        calloutStyles[block.variant]
      )}
    >
      {block.title ? (
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {block.variant === 'tip' && 'Tip'}
          {block.variant === 'note' && 'Note'}
          {block.variant === 'warn' && 'Important'}
          {' · '}
          {block.title}
        </p>
      ) : (
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {block.variant === 'tip' && 'Tip'}
          {block.variant === 'note' && 'Note'}
          {block.variant === 'warn' && 'Warning'}
        </p>
      )}
      <p className="mt-2 text-[15px] leading-relaxed text-foreground">{block.content}</p>
    </div>
  )
}
