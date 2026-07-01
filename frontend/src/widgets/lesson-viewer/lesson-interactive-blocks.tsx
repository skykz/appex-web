import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Check, Copy, X } from 'lucide-react'
import { cn } from '@shared/lib'
import { Button, Input, Textarea } from '@shared/ui'
import type { LessonBlock } from './lesson-types'
import { lessonApi, type SavedQuizAttempt } from './api'
import { renderLinkedText } from './render-linked-text'

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

const MAX_SUBMISSION_FILE_BYTES = 15 * 1024 * 1024

/**
 * Picks a stable phrase from a list so feedback varies between blocks without flickering on re-render.
 */
function pickPhrase<T extends readonly string[]>(list: T, seed: number): T[number] {
  const i = Math.abs(seed) % list.length
  return list[i]!
}

/**
 * Converts a selected file to plain base64 so the authenticated JSON API can store it.
 */
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read file. Please choose it again.'))
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Formats file sizes for the submission helper text.
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Renders an interactive quiz with server-side answer checking (correct answers are not shipped to the client).
 */
export function QuizBlockView({
  lessonId,
  stepIndex,
  blockIndex,
  block,
  restoredAttempt = null,
}: {
  lessonId: number
  stepIndex: number
  blockIndex: number
  block: QuizBlock
  restoredAttempt?: SavedQuizAttempt | null
}) {
  const qc = useQueryClient()
  const mode = getQuizInteractionMode(block)
  const [selected, setSelected] = useState<number[]>([])
  const [openText, setOpenText] = useState('')
  const [result, setResult] = useState<{
    correct: boolean
    explanation: string | null
    correctIndices?: number[]
  } | null>(null)

  /** Clears local state when the learner navigates to a different quiz block. */
  useEffect(() => {
    setSelected([])
    setOpenText('')
    setResult(null)
  }, [lessonId, stepIndex, blockIndex])

  /** Restores saved answers when resuming an in-progress lesson (not on refetch with no saved attempt). */
  useEffect(() => {
    if (!restoredAttempt) return

    setSelected(restoredAttempt.selectedIndices ?? [])
    setOpenText(restoredAttempt.openAnswer ?? '')
    setResult({
      correct: restoredAttempt.correct,
      explanation: restoredAttempt.explanation,
      correctIndices: restoredAttempt.correctIndices ?? [],
    })
  }, [
    restoredAttempt?.correct,
    restoredAttempt?.explanation,
    restoredAttempt?.openAnswer,
    restoredAttempt?.selectedIndices?.join(','),
    restoredAttempt?.correctIndices?.join(','),
  ])

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
    onSuccess: (data) => {
      setResult(data)
      void qc.invalidateQueries({ queryKey: ['lesson', lessonId] })
    },
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
  const correctAfterSubmit = new Set(result?.correctIndices ?? [])

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
            const hasResult = result !== null
            const isCorrectOption = hasResult && correctAfterSubmit.has(idx)
            const isWrongSelected = hasResult && isSelected && !isCorrectOption

            return (
              <li key={idx}>
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  disabled={mutation.isPending || result !== null}
                  aria-pressed={isSelected}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-xl border-2 px-3 py-3 text-left text-[15px] leading-relaxed transition-all',
                    !hasResult &&
                      !isSelected &&
                      'border-zinc-200 bg-white hover:border-orange-200 hover:bg-orange-50/50',
                    isSelected &&
                      !result &&
                      'border-primary bg-primary/[0.12] shadow-[inset_3px_0_0_0_hsl(var(--primary))] ring-2 ring-primary/25',
                    hasResult &&
                      !isSelected &&
                      !isCorrectOption &&
                      'border-zinc-200 bg-white opacity-75',
                    isCorrectOption &&
                      'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200',
                    isWrongSelected &&
                      'border-red-500 bg-red-50 ring-2 ring-red-200'
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
                      isCorrectOption &&
                        'border-emerald-600 bg-emerald-600 text-white',
                      isWrongSelected &&
                        'border-red-600 bg-red-600 text-white'
                    )}
                  >
                    {isWrongSelected ? (
                      <X className="size-4" strokeWidth={3} aria-hidden />
                    ) : isSelected || isCorrectOption ? (
                      <Check className="size-4" strokeWidth={3} aria-hidden />
                    ) : (
                      idx + 1
                    )}
                  </span>
                  <span
                    className={cn(
                      'min-w-0 flex-1 pt-0.5',
                      isSelected && !result && 'font-medium text-zinc-900',
                      isCorrectOption && 'font-medium text-emerald-950',
                      isWrongSelected && 'font-medium text-red-950'
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
 * Collects student text and an optional uploaded file, then posts it to the lesson submissions API.
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const { data: existing } = useQuery({
    queryKey: ['lesson-submission', lessonId],
    queryFn: () => lessonApi.getMySubmission(lessonId),
  })

  const submit = useMutation({
    mutationFn: async () => {
      let attachmentUrl: string | undefined
      if (selectedFile) {
        const dataBase64 = await readFileAsBase64(selectedFile)
        const uploaded = await lessonApi.uploadSubmissionFile(lessonId, {
          fileName: selectedFile.name,
          contentType: selectedFile.type || 'application/octet-stream',
          size: selectedFile.size,
          dataBase64,
        })
        attachmentUrl = uploaded.attachmentUrl
      }
      return lessonApi.submitSubmission(lessonId, {
        message: message.trim() || undefined,
        attachmentUrl,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lesson-submission', lessonId] })
      qc.invalidateQueries({ queryKey: ['lesson-submissions', 'me'] })
      setMessage('')
      setSelectedFile(null)
      setFileError(null)
    },
  })

  /**
   * Validates the optional submission attachment before upload.
   */
  function handleFileChange(file: File | undefined) {
    if (!file) {
      setSelectedFile(null)
      setFileError(null)
      return
    }
    if (file.size > MAX_SUBMISSION_FILE_BYTES) {
      setSelectedFile(null)
      setFileError(`File is too large. Maximum size is ${formatBytes(MAX_SUBMISSION_FILE_BYTES)}.`)
      return
    }
    setSelectedFile(file)
    setFileError(null)
  }

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
        <div className="mt-3 rounded-xl border border-border/70 bg-background/80 p-3">
          <label className="text-xs font-semibold text-muted-foreground">
            Attach file
          </label>
          <Input
            key={selectedFile ? `${selectedFile.name}-${selectedFile.lastModified}` : 'empty-file'}
            className="mt-2 border-border/80 bg-background"
            type="file"
            onChange={(e) => handleFileChange(e.target.files?.[0])}
            disabled={submit.isPending}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Any file type, up to {formatBytes(MAX_SUBMISSION_FILE_BYTES)}.
          </p>
          {selectedFile ? (
            <p className="mt-2 text-xs font-medium text-foreground">
              Selected: {selectedFile.name} ({formatBytes(selectedFile.size)})
            </p>
          ) : null}
          {fileError ? (
            <p className="mt-2 text-xs font-medium text-destructive">{fileError}</p>
          ) : null}
        </div>
      ) : null}
      <Button
        type="button"
        className="mt-3"
        size="sm"
        disabled={(!message.trim() && !selectedFile) || Boolean(fileError) || submit.isPending}
        onClick={() => submit.mutate()}
      >
        {submit.isPending ? 'Uploading…' : 'Submit work'}
      </Button>
      {submit.error instanceof Error ? (
        <p className="mt-2 text-xs font-medium text-destructive">{submit.error.message}</p>
      ) : null}
      {existing ? (
        <div className="mt-4 rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm">
          <p className="text-xs font-medium text-muted-foreground">Latest submission</p>
          {existing.grade ? (
            <p className="mt-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              Grade: {existing.grade}
            </p>
          ) : null}
          <p className="mt-1 whitespace-pre-wrap text-foreground">{existing.message}</p>
          {existing.admin_feedback ? (
            <p className="mt-2 border-t border-border/60 pt-2 text-muted-foreground">
              <span className="font-semibold text-foreground">Feedback: </span>
              {existing.admin_feedback}
            </p>
          ) : null}
          {existing.attachment_url ? (
            <a
              href={existing.attachment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm font-medium text-primary underline"
            >
              Open submitted file
            </a>
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
 * Copyable prompt card shown inside lesson steps (handoff prompts, Claude instructions, etc.).
 */
export function PromptBlockView({
  block,
}: {
  block: Extract<LessonBlock, { type: 'prompt' }>
}) {
  const [copied, setCopied] = useState(false)

  /** Copies the prompt body to the learner clipboard. */
  async function handleCopy() {
    if (!block.content.trim()) return
    try {
      await navigator.clipboard.writeText(block.content)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard may be blocked on insecure origins or denied permissions.
    }
  }

  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-border/80 bg-muted/30 shadow-sm first:mt-0">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
        <p className="text-sm font-semibold text-foreground">{block.title}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={copied ? 'Copied' : 'Copy prompt'}
          onClick={() => void handleCopy()}
        >
          {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
        </Button>
      </div>
      <p className="whitespace-pre-wrap px-4 py-3 font-mono text-[13px] leading-relaxed text-foreground">
        {block.content}
      </p>
    </div>
  )
}

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
      <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
        {renderLinkedText(block.content, 'callout')}
      </p>
    </div>
  )
}
