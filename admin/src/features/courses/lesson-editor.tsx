import { useState } from 'react'
import {
  useForm,
  useFieldArray,
  Controller,
  useWatch,
  type FieldErrors,
  type Resolver,
  type UseFormReturn,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown, Eye, Sparkles } from 'lucide-react'
import {
  lessonEditorFormSchema,
  normalizeLessonContentSteps,
  type LessonEditorFormValues,
} from '@appex/lesson-schema'
import {
  coursesApi,
  type ImportedLessonDraft,
  type Lesson,
  type LessonBlock,
  type LessonStep,
} from './api'
import { cn } from '@shared/lib'
import { Button } from '@shared/ui/button'
import { Checkbox } from '@shared/ui/checkbox'
import { Input } from '@shared/ui/input'
import { Textarea } from '@shared/ui/textarea'
import { LessonMarkdownTextarea } from '@shared/ui/lesson-markdown-textarea'
import { Label } from '@shared/ui/label'
import { Select } from '@shared/ui/select'
import { DialogDescription, DialogHeader, DialogTitle } from '@shared/ui/dialog'
import { ApiError } from '@shared/api/http-client'
import { MediaBadgeField } from '@shared/ui/media-badge-field'
import { ImageSrcField } from '@shared/ui/image-src-field'
import { FileSrcField } from '@shared/ui/file-src-field'
import { LessonPreviewDialog } from './lesson-preview-dialog'

/**
 * Builds form steps from API lesson content using shared normalization (`@appex/lesson-schema`).
 */
function normalizeLessonStepsFromApi(
  content: Lesson['content'] | undefined
): LessonEditorFormValues['steps'] {
  const steps = normalizeLessonContentSteps(content ?? [])
  if (steps.length === 0) return [{ blocks: [{ type: 'heading', content: '' }] }]
  return steps
}

/**
 * Returns the first nested react-hook-form / Zod error message for a toast or summary line.
 */
function firstValidationMessage(errors: FieldErrors): string | undefined {
  for (const v of Object.values(errors)) {
    if (!v) continue
    if (
      typeof v === 'object' &&
      v !== null &&
      'message' in v &&
      typeof (v as { message?: string }).message === 'string'
    ) {
      return (v as { message: string }).message
    }
    if (typeof v === 'object' && v !== null) {
      const nested = firstValidationMessage(v as FieldErrors)
      if (nested) return nested
    }
  }
  return undefined
}

interface Props {
  moduleId: number
  initial?: Lesson
  draft?: ImportedLessonDraft
  onDone: () => void
}

export function LessonEditor({ moduleId, initial, draft, onDone }: Props) {
  const qc = useQueryClient()
  const [previewOpen, setPreviewOpen] = useState(false)

  const form = useForm<LessonEditorFormValues>({
    resolver: zodResolver(lessonEditorFormSchema) as Resolver<LessonEditorFormValues>,
    mode: 'onSubmit',
    defaultValues: {
      label: initial?.label ?? draft?.label ?? 'Lesson 1',
      title: initial?.title ?? draft?.title ?? '',
      emoji: initial?.emoji ?? draft?.emoji ?? '📘',
      is_visible: initial?.is_visible ?? draft?.is_visible ?? false,
      order: initial?.order ?? 0,
      steps: initial
        ? normalizeLessonStepsFromApi(initial.content)
        : draft?.steps ?? [{ blocks: [{ type: 'heading', content: '' }] }],
    },
  })

  const {
    fields: stepFields,
    append: appendStep,
    remove: removeStep,
    move: moveStep,
  } = useFieldArray({ control: form.control, name: 'steps' })

  const watchedLabel = useWatch({ control: form.control, name: 'label' })
  const watchedTitle = useWatch({ control: form.control, name: 'title' })
  const watchedEmoji = useWatch({ control: form.control, name: 'emoji' })
  const watchedSteps = useWatch({ control: form.control, name: 'steps' })

  const mutation = useMutation({
    mutationFn: (values: LessonEditorFormValues) => {
      const payload = {
        label: values.label,
        title: values.title,
        emoji: values.emoji,
        is_visible: values.is_visible,
        order: values.order,
        content: values.steps as LessonStep[],
      }
      return initial
        ? coursesApi.updateLesson(initial.id, payload)
        : coursesApi.createLesson(moduleId, payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'course'] })
      toast.success(initial ? 'Lesson saved' : 'Lesson created')
      onDone()
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : 'Failed'
      toast.error(msg)
    },
  })

  function onSubmit(values: LessonEditorFormValues) {
    mutation.mutate(values)
  }

  function onInvalid(errors: FieldErrors<LessonEditorFormValues>) {
    const msg = firstValidationMessage(errors)
    toast.error(msg ?? 'Fix validation errors before saving.')
  }

  return (
    <>
      <form
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <DialogHeader className="shrink-0 border-b border-border/60 bg-muted/20 px-5 py-3 pr-16 text-left sm:px-6 sm:pr-16">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="text-base">
                {initial ? 'Edit lesson' : 'New lesson'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Lessons are made of steps; each step has blocks rendered in the user app.
              </DialogDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <label className="flex h-8 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm">
                <Checkbox {...form.register('is_visible')} />
                Visibility
              </label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-2 bg-background"
                onClick={() => appendStep({ blocks: [{ type: 'heading', content: '' }] })}
              >
                <Plus className="h-4 w-4" />
                Add step
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-2 bg-background"
                onClick={() => setPreviewOpen(true)}
              >
                <Eye className="h-4 w-4" aria-hidden />
                Preview
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 bg-background"
                onClick={onDone}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8 min-w-28"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Save lesson'
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-4">
          <input type="hidden" {...form.register('order')} />
          <div className="grid gap-3 sm:grid-cols-[minmax(0,8rem)_1fr]">
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input placeholder="Lesson 1" {...form.register('label')} />
              {form.formState.errors.label?.message ? (
                <p className="text-xs text-destructive">{form.formState.errors.label.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input placeholder="Introduction" {...form.register('title')} />
              {form.formState.errors.title?.message ? (
                <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
              ) : null}
            </div>
          </div>
          <Controller
            name="emoji"
            control={form.control}
            render={({ field }) => (
              <MediaBadgeField
                label="Lesson badge"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={form.formState.errors.emoji?.message}
                helperText="Emoji, image URL, path, or upload — shown next to the lesson in the catalog."
              />
            )}
          />
          <p className="text-xs text-muted-foreground">
            Lesson order within the module is set on the course page (move up / down).
          </p>
          <div className="space-y-3">
            {form.formState.errors.steps &&
            typeof form.formState.errors.steps.message === 'string' ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {form.formState.errors.steps.message}
              </p>
            ) : null}
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/95 px-4 py-2 shadow-sm">
              <Label>Steps ({stepFields.length})</Label>
            </div>

            {stepFields.map((step, stepIdx) => (
              <div key={step.id} className="rounded-lg border bg-muted/20 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="flex size-6 items-center justify-center rounded-md bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
                      {stepIdx + 1}
                    </span>
                    Step {stepIdx + 1}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={stepIdx === 0}
                      onClick={() => moveStep(stepIdx, stepIdx - 1)}
                      aria-label={`Move step ${stepIdx + 1} up`}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={stepIdx === stepFields.length - 1}
                      onClick={() => moveStep(stepIdx, stepIdx + 1)}
                      aria-label={`Move step ${stepIdx + 1} down`}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (stepFields.length === 1) {
                          toast.error('At least one step is required.')
                          return
                        }
                        removeStep(stepIdx)
                      }}
                      aria-label={`Delete step ${stepIdx + 1}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <StepBlocksEditor form={form} stepIdx={stepIdx} />
              </div>
            ))}
          </div>
        </div>
      </form>
      <LessonPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        label={typeof watchedLabel === 'string' ? watchedLabel : ''}
        title={typeof watchedTitle === 'string' ? watchedTitle : ''}
        emoji={typeof watchedEmoji === 'string' ? watchedEmoji : '📘'}
        steps={watchedSteps ?? form.getValues('steps')}
      />
    </>
  )
}

function StepBlocksEditor({
  form,
  stepIdx,
}: {
  form: UseFormReturn<LessonEditorFormValues>
  stepIdx: number
}) {
  const {
    fields: blockFields,
    append,
    remove,
    move,
  } = useFieldArray({
    control: form.control,
    name: `steps.${stepIdx}.blocks` as const,
  })

  const [newType, setNewType] = useState<LessonBlock['type']>('text')

  function addBlock() {
    append(defaultBlock(newType))
  }

  return (
    <div className="space-y-2">
      {blockFields.map((field, blockIdx) => (
        <BlockRow
          key={field.id}
          form={form}
          stepIdx={stepIdx}
          blockIdx={blockIdx}
          total={blockFields.length}
          onRemove={() => remove(blockIdx)}
          onMove={(dir) => move(blockIdx, blockIdx + dir)}
        />
      ))}

      <div className="flex items-center gap-2 pt-1">
        <Select
          value={newType}
          onChange={(e) => setNewType(e.target.value as LessonBlock['type'])}
          className="h-9 w-40"
        >
          <option value="heading">Heading</option>
          <option value="text">Text</option>
          <option value="list">List</option>
          <option value="image">Image</option>
          <option value="video">Video</option>
          <option value="file">Download file</option>
          <option value="link">Link</option>
          <option value="quiz">Quiz</option>
          <option value="submission">Student submission</option>
          <option value="callout">Callout</option>
          <option value="table">Interactive table</option>
          <option value="guide">Interactive guide</option>
          <option value="playground">AI Playground</option>
          <option value="prompt">Copy prompt</option>
          <option value="user-message">User message</option>
          <option value="mentor-message">Mentor message</option>
        </Select>
        <Button type="button" size="sm" variant="outline" onClick={addBlock}>
          <Plus className="h-4 w-4" /> Add block
        </Button>
      </div>
    </div>
  )
}

function BlockRow({
  form,
  stepIdx,
  blockIdx,
  total,
  onRemove,
  onMove,
}: {
  form: UseFormReturn<LessonEditorFormValues>
  stepIdx: number
  blockIdx: number
  total: number
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
}) {
  const type = form.watch(`steps.${stepIdx}.blocks.${blockIdx}.type`)
  const quizMode =
    type === 'quiz'
      ? (form.watch(`steps.${stepIdx}.blocks.${blockIdx}.mode`) as string | undefined)
      : undefined
  const typeLabel =
    type === 'quiz' && quizMode ? `quiz · ${quizMode}` : type

  return (
    <div className="rounded-md border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {typeLabel}
        </span>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={blockIdx === 0}
            onClick={() => onMove(-1)}
            aria-label={`Move ${typeLabel} block up`}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={blockIdx === total - 1}
            onClick={() => onMove(1)}
            aria-label={`Move ${typeLabel} block down`}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            aria-label={`Delete ${typeLabel} block`}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </div>
      <BlockFields form={form} stepIdx={stepIdx} blockIdx={blockIdx} />
    </div>
  )
}

/** Hint shown under text fields that support `**bold**` and `""italic""` markdown. */
function InlineMarkdownHint() {
  return (
    <p className="text-xs text-muted-foreground">
      Use <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">**bold text**</code> or{' '}
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">{'""italic text""'}</code> for emphasis.
      Add <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">[link name](https://example.com)</code> or highlight with <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">==text==</code> and <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">==blue:text==</code>.
    </p>
  )
}

/**
 * Per-row editor for quiz options. Unlike a single textarea that replaces the whole
 * array on every keystroke, each option is a discrete row with its own add/remove/move
 * actions — so correctIndex/correctIndices can be remapped in lockstep with the edit
 * instead of silently pointing at the wrong option afterwards.
 */
function QuizOptionsEditor({
  form,
  base,
  mode,
}: {
  form: UseFormReturn<LessonEditorFormValues>
  base: `steps.${number}.blocks.${number}`
  mode: 'single' | 'multi'
}) {
  const options = (form.watch(`${base}.options` as const) as string[] | undefined) ?? []

  /** Updates one option's text in place without touching any indices. */
  function updateOption(idx: number, value: string) {
    const next = [...options]
    next[idx] = value
    form.setValue(`${base}.options` as const, next, { shouldDirty: true })
  }

  /** Appends a blank option row; existing correct-answer indices are unaffected. */
  function addOption() {
    form.setValue(`${base}.options` as const, [...options, ''], { shouldDirty: true })
  }

  /** Removes option `idx` and remaps correct-answer indices so they still point at the same text. */
  function removeOption(idx: number) {
    // Guard on rows that would actually survive validation, not raw row count —
    // otherwise two filled options plus a blank row reads as "3 options" and the
    // last real one becomes deletable, leaving an unsavable quiz.
    const filledCount = options.filter((o) => o.trim()).length
    const removingFilled = Boolean(options[idx]?.trim())
    if (removingFilled && filledCount <= 2) {
      toast.error('A quiz needs at least 2 options.')
      return
    }
    const next = options.filter((_, i) => i !== idx)
    form.setValue(`${base}.options` as const, next, { shouldDirty: true })

    if (mode === 'single') {
      const current = Number(form.getValues(`${base}.correctIndex` as const))
      const remapped = current === idx ? 0 : current > idx ? current - 1 : current
      form.setValue(`${base}.correctIndex` as const, remapped, { shouldDirty: true })
    } else {
      const current = (form.getValues(`${base}.correctIndices` as const) as number[]) ?? []
      const remapped = current
        .filter((i) => i !== idx)
        .map((i) => (i > idx ? i - 1 : i))
      form.setValue(`${base}.correctIndices` as const, remapped, { shouldDirty: true })
    }
  }

  /** Swaps option `idx` with its neighbor at `idx + delta` and moves correct-answer indices with it. */
  function moveOption(idx: number, delta: -1 | 1) {
    const target = idx + delta
    if (target < 0 || target >= options.length) return
    const next = [...options]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    form.setValue(`${base}.options` as const, next, { shouldDirty: true })

    const remapIndex = (i: number) => (i === idx ? target : i === target ? idx : i)
    if (mode === 'single') {
      const current = Number(form.getValues(`${base}.correctIndex` as const))
      form.setValue(`${base}.correctIndex` as const, remapIndex(current), { shouldDirty: true })
    } else {
      const current = (form.getValues(`${base}.correctIndices` as const) as number[]) ?? []
      form.setValue(
        `${base}.correctIndices` as const,
        current.map(remapIndex).sort((a, b) => a - b),
        { shouldDirty: true }
      )
    }
  }

  const correctIndex = Number(form.watch(`${base}.correctIndex` as const))
  const correctIndices = new Set(
    (form.watch(`${base}.correctIndices` as const) as number[] | undefined) ?? []
  )

  return (
    <div className="grid gap-2">
      <Label className="text-xs text-muted-foreground">
        Options ({mode === 'single' ? 'select the correct one' : 'check all correct ones'}, min 2)
      </Label>
      {options.map((opt, idx) => (
        <div key={idx} className="flex items-center gap-2">
          {mode === 'single' ? (
            <input
              type="radio"
              name={`quiz-correct-${base}`}
              className="shrink-0 accent-primary"
              checked={correctIndex === idx}
              onChange={() => form.setValue(`${base}.correctIndex` as const, idx, { shouldDirty: true })}
              aria-label={`Mark option ${idx + 1} as correct`}
            />
          ) : (
            <Checkbox
              checked={correctIndices.has(idx)}
              onChange={() => {
                const next = new Set(correctIndices)
                if (next.has(idx)) next.delete(idx)
                else next.add(idx)
                form.setValue(
                  `${base}.correctIndices` as const,
                  [...next].sort((a, b) => a - b),
                  { shouldDirty: true }
                )
              }}
              aria-label={`Mark option ${idx + 1} as correct`}
            />
          )}
          <Input
            className={cn(
              'flex-1',
              // A blank option can't be saved: dropping it server-side would shift
              // every correct-answer index after it, so flag it here at the row.
              !opt.trim() && 'border-destructive/60 focus-visible:ring-destructive'
            )}
            placeholder={`Option ${idx + 1}`}
            value={opt}
            onChange={(e) => updateOption(idx, e.target.value)}
            aria-invalid={!opt.trim()}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={idx === 0}
            onClick={() => moveOption(idx, -1)}
            aria-label={`Move option ${idx + 1} up`}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={idx === options.length - 1}
            onClick={() => moveOption(idx, 1)}
            aria-label={`Move option ${idx + 1} down`}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeOption(idx)}
            aria-label={`Delete option ${idx + 1}`}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ))}
      {options.some((o) => !o.trim()) ? (
        <p role="alert" className="text-xs text-destructive">
          Every option needs text. Fill the highlighted rows in or delete them — a blank option
          can&apos;t be saved, because removing it would shift which option is marked correct.
        </p>
      ) : null}
      <Button type="button" variant="outline" size="sm" className="w-fit gap-2" onClick={addOption}>
        <Plus className="h-3.5 w-3.5" />
        Add option
      </Button>
    </div>
  )
}

function BlockFields({
  form,
  stepIdx,
  blockIdx,
}: {
  form: UseFormReturn<LessonEditorFormValues>
  stepIdx: number
  blockIdx: number
}) {
  const base = `steps.${stepIdx}.blocks.${blockIdx}` as const
  const type = form.watch(`${base}.type`)

  if (type === 'list') {
    return (
      <div className="grid gap-2">
        <Controller
          control={form.control}
          name={`${base}.items` as const}
          render={({ field }) => {
            const items = Array.isArray(field.value) ? field.value : []
            return (
              <LessonMarkdownTextarea
                rows={3}
                placeholder="One item per line"
                pasteMode="list"
                value={items.join('\n')}
                onValueChange={(next) =>
                  field.onChange(
                    next.split('\n').map((s) => s.trimEnd()).filter(Boolean)
                  )
                }
              />
            )
          }}
        />
        <Controller
          control={form.control}
          name={`${base}.checkable` as const}
          render={({ field }) => (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={Boolean(field.value)} onChange={(event) => field.onChange(event.target.checked)} />
              Learners can tick items
            </label>
          )}
        />
        <InlineMarkdownHint />
      </div>
    )
  }
  if (type === 'image') {
    return (
      <div className="grid gap-2">
        <Controller
          control={form.control}
          name={`${base}.src` as const}
          render={({ field }) => (
            <ImageSrcField
              label="Image"
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <Input
          placeholder="Alt text (optional)"
          {...form.register(`${base}.alt` as const)}
        />
      </div>
    )
  }
  if (type === 'video') {
    return (
      <div className="grid gap-2">
        <Input
          placeholder="Video URL (YouTube, Vimeo, or direct .mp4 /path…)"
          {...form.register(`${base}.src` as const)}
        />
        <Input placeholder="Title (optional)" {...form.register(`${base}.title` as const)} />
        <Textarea
          rows={2}
          placeholder="Caption (optional)"
          {...form.register(`${base}.caption` as const)}
        />
      </div>
    )
  }
  if (type === 'link') {
    return (
      <div className="grid gap-2">
        <Input
          placeholder="Link URL (https://…)"
          {...form.register(`${base}.url` as const)}
        />
        <Input placeholder="Label (e.g. Figma prototype)" {...form.register(`${base}.label` as const)} />
        <Textarea
          rows={2}
          placeholder="Short description (optional)"
          {...form.register(`${base}.description` as const)}
        />
      </div>
    )
  }
  if (type === 'file') {
    const fileValue = form.watch(base) as Extract<LessonBlock, { type: 'file' }>
    return (
      <FileSrcField
        url={fileValue?.url ?? ''}
        label={fileValue?.label ?? ''}
        description={fileValue?.description ?? ''}
        onUrlChange={(nextUrl) =>
          form.setValue(`${base}.url` as const, nextUrl, { shouldDirty: true })
        }
        onLabelChange={(nextLabel) =>
          form.setValue(`${base}.label` as const, nextLabel, { shouldDirty: true })
        }
        onDescriptionChange={(nextDescription) =>
          form.setValue(`${base}.description` as const, nextDescription, { shouldDirty: true })
        }
      />
    )
  }
  if (type === 'quiz') {
    const mode = form.watch(`${base}.mode`) as 'single' | 'multi' | 'open'

    return (
      <div className="grid gap-3 rounded-md border border-primary/15 bg-muted/25 p-3">
        <div className="grid gap-1">
          <Label className="text-xs text-muted-foreground">Question type</Label>
          <Select
            value={mode}
            onChange={(e) => {
              const m = e.target.value as 'single' | 'multi' | 'open'
              const q = String(form.getValues(`${base}.question`) ?? '')
              const expl = form.getValues(`${base}.explanation`)
              const explStr = expl != null && String(expl).trim() ? String(expl) : undefined
              const prevOpts = form.getValues(`${base}.options`) as string[] | undefined
              const lines =
                Array.isArray(prevOpts) && prevOpts.some((s) => String(s).trim())
                  ? prevOpts.map((s) => String(s))
                  : ['', '']
              if (m === 'single') {
                form.setValue(base as never, {
                  type: 'quiz',
                  mode: 'single',
                  question: q,
                  options: lines.length >= 2 ? lines : ['', ''],
                  correctIndex: 0,
                  ...(explStr ? { explanation: explStr } : {}),
                } as never)
              } else if (m === 'multi') {
                form.setValue(base as never, {
                  type: 'quiz',
                  mode: 'multi',
                  question: q,
                  options: lines.length >= 2 ? lines : ['', ''],
                  correctIndices: [0],
                  ...(explStr ? { explanation: explStr } : {}),
                } as never)
              } else {
                form.setValue(base as never, {
                  type: 'quiz',
                  mode: 'open',
                  question: q,
                  ...(explStr ? { explanation: explStr } : {}),
                } as never)
              }
            }}
          >
            <option value="single">Single choice</option>
            <option value="multi">Multiple choice</option>
            <option value="open">Open answer</option>
          </Select>
        </div>
        <Input placeholder="Question" {...form.register(`${base}.question` as const)} />
        {mode === 'open' ? (
          <p className="text-xs text-muted-foreground">
            Learners write a free-text answer; it is saved for review (no auto-grading). Optional
            explanation below can be shown after they submit.
          </p>
        ) : (
          <QuizOptionsEditor form={form} base={base} mode={mode} />
        )}
        <div className="grid gap-1">
          <Label className="text-xs text-muted-foreground">After submit (optional)</Label>
          <Textarea
            rows={2}
            placeholder="Explanation or sample answer shown after checking / submitting"
            {...form.register(`${base}.explanation` as const)}
          />
        </div>
      </div>
    )
  }
  if (type === 'submission') {
    return (
      <div className="grid gap-2">
        <Textarea rows={2} placeholder="Prompt for learners" {...form.register(`${base}.prompt` as const)} />
        <Controller
          control={form.control}
          name={`${base}.acceptAttachment` as const}
          render={({ field }) => (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={Boolean(field.value)}
                onChange={(e) => field.onChange(e.target.checked)}
              />
              Allow file upload field
            </label>
          )}
        />
      </div>
    )
  }
  if (type === 'callout') {
    return (
      <div className="grid gap-2">
        <Select {...form.register(`${base}.variant`)}>
          <option value="tip">Tip</option>
          <option value="note">Note</option>
          <option value="warn">Warning</option>
        </Select>
        <Input placeholder="Title (optional)" {...form.register(`${base}.title` as const)} />
        <p className="text-xs text-muted-foreground">Tips are expandable and start closed. Notes and warnings always stay open.</p>
        <Controller
          control={form.control}
          name={`${base}.content` as const}
          render={({ field }) => (
            <LessonMarkdownTextarea
              rows={3}
              placeholder="Body"
              value={field.value ?? ''}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <InlineMarkdownHint />
      </div>
    )
  }
  if (type === 'table') {
    const value = form.watch(`${base}.items` as const) as Array<{ label: string; content: string }> | undefined
    return <div className="grid gap-2">
      <Input placeholder="Table title (optional)" {...form.register(`${base}.title` as const)} />
      <Controller control={form.control} name={`${base}.items` as const} render={({ field }) => (
        <Textarea rows={6} placeholder={'Tab name | Content shown when clicked\nSecond tab | Different content'} value={(value ?? []).map((item) => `${item.label} | ${item.content}`).join('\n')} onChange={(event) => field.onChange(event.target.value.split('\n').filter(Boolean).map((line) => { const split = line.indexOf('|'); return { label: (split >= 0 ? line.slice(0, split) : line).trim(), content: (split >= 0 ? line.slice(split + 1) : '').trim() } }))} />
      )} />
      <p className="text-xs text-muted-foreground">One clickable item per line: label | content. Add at least two.</p>
      {value && value.length < 2 ? <p className="text-xs text-destructive">Add at least two items.</p> : null}
    </div>
  }
  if (type === 'guide') {
    const value = form.watch(`${base}.steps` as const) as Array<{ title: string; content: string }> | undefined
    return <div className="grid gap-2">
      <Input placeholder="Guide title" {...form.register(`${base}.title` as const)} />
      <Textarea rows={2} placeholder="Short introduction (optional)" {...form.register(`${base}.description` as const)} />
      <Controller control={form.control} name={`${base}.steps` as const} render={({ field }) => (
        <Textarea rows={7} placeholder={'Step name | Content for this guide step\nNext step | What the learner does next'} value={(value ?? []).map((step) => `${step.title} | ${step.content}`).join('\n')} onChange={(event) => field.onChange(event.target.value.split('\n').filter(Boolean).map((line) => { const split = line.indexOf('|'); return { title: (split >= 0 ? line.slice(0, split) : line).trim(), content: (split >= 0 ? line.slice(split + 1) : '').trim() } }))} />
      )} />
      <p className="text-xs text-muted-foreground">One internal guide step per line: step name | content. Add at least two.</p>
      {value && value.length < 2 ? <p className="text-xs text-destructive">Add at least two guide steps.</p> : null}
    </div>
  }
  if (type === 'playground') {
    return <PlaygroundFields form={form} stepIdx={stepIdx} blockIdx={blockIdx} />
  }
  if (type === 'prompt') {
    return (
      <div className="grid gap-2">
        <Input placeholder="Card title (e.g. Prototype handoff prompt)" {...form.register(`${base}.title` as const)} />
        <Textarea
          rows={8}
          placeholder="Paste the full prompt learners should copy into Claude…"
          className="font-mono text-sm"
          {...form.register(`${base}.content` as const)}
        />
      </div>
    )
  }
  if (type === 'user-message') {
    return (
      <div className="grid gap-2">
        <Input placeholder="User name" {...form.register(`${base}.name` as const)} />
        <Textarea rows={2} placeholder="Message" {...form.register(`${base}.text` as const)} />
      </div>
    )
  }
  if (type === 'mentor-message') {
    return (
      <div className="grid gap-1">
        <Controller
          control={form.control}
          name={`${base}.text` as const}
          render={({ field }) => (
            <LessonMarkdownTextarea
              rows={2}
              placeholder="Mentor message"
              value={field.value ?? ''}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <InlineMarkdownHint />
      </div>
    )
  }
  if (type === 'text' || type === 'bold-text') {
    return (
      <div className="grid gap-1">
        <Controller
          control={form.control}
          name={`${base}.content` as const}
          render={({ field }) => (
            <LessonMarkdownTextarea
              rows={3}
              placeholder={type === 'bold-text' ? 'Bold paragraph' : 'Paragraph text'}
              value={field.value ?? ''}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <InlineMarkdownHint />
      </div>
    )
  }
  // heading
  return (
    <Textarea
      rows={1}
      placeholder="Heading text"
      {...form.register(`${base}.content` as const)}
    />
  )
}

function PlaygroundFields({ form, stepIdx, blockIdx }: {
  form: UseFormReturn<LessonEditorFormValues>
  stepIdx: number
  blockIdx: number
}) {
  const base = `steps.${stepIdx}.blocks.${blockIdx}` as const
  const value = form.watch(base) as Extract<LessonBlock, { type: 'playground' }>
  const generation = useMutation({
    mutationFn: () => coursesApi.generatePlaygroundDraft({
      prompt: value.prompt,
      documentUrl: value.documentUrl || undefined,
      documentLabel: value.documentLabel || undefined,
      lessonContext: JSON.stringify(form.getValues('steps')).slice(0, 20_000),
    }),
    onSuccess: (draft) => {
      form.setValue(`${base}.answer` as const, draft.answer, { shouldDirty: true, shouldValidate: true })
      form.setValue(`${base}.previewUrl` as const, draft.previewUrl ?? '', { shouldDirty: true })
      form.setValue(`${base}.previewLabel` as const, draft.previewLabel ?? '', { shouldDirty: true })
      toast.success('AI draft generated. Review it, then save the lesson.')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not generate the Playground draft.')
    },
  })

  return <div className="grid gap-3">
    <Input placeholder="Block title" {...form.register(`${base}.title` as const)} />
    <div className="grid gap-1"><Label className="text-xs text-muted-foreground">Ready prompt</Label><Textarea rows={7} className="font-mono text-sm" placeholder="Prompt learners can copy or try" {...form.register(`${base}.prompt` as const)} /></div>
    <div className="grid gap-2"><p className="text-xs font-semibold text-muted-foreground">Optional input document</p><FileSrcField
      url={value?.documentUrl ?? ''}
      label={value?.documentLabel ?? ''}
      description=""
      onUrlChange={(next) => form.setValue(`${base}.documentUrl` as const, next, { shouldDirty: true })}
      onLabelChange={(next) => form.setValue(`${base}.documentLabel` as const, next, { shouldDirty: true })}
      onDescriptionChange={() => undefined}
    /></div>
    <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-3">
      <Button type="button" size="sm" disabled={generation.isPending || !value.prompt?.trim()} onClick={() => generation.mutate()} className="gap-2">
        {generation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {generation.isPending ? 'Generating draft…' : value.answer?.trim() ? 'Regenerate draft with AI' : 'Generate draft with AI'}
      </Button>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">AI generates an editable answer and, when requested, a preview file. Review the draft below and use Save lesson to approve it for learners.</p>
    </div>
    <div className="grid gap-1"><Label className="text-xs text-muted-foreground">Prepared answer — review and edit</Label><Textarea rows={7} placeholder="Generate with AI or write the answer manually" {...form.register(`${base}.answer` as const)} /></div>
    <div className="border-t border-border/70 pt-3"><p className="mb-2 text-xs font-semibold text-muted-foreground">Prepared preview or generated output file</p><FileSrcField
      url={value?.previewUrl ?? ''}
      label={value?.previewLabel ?? ''}
      description=""
      onUrlChange={(next) => form.setValue(`${base}.previewUrl` as const, next, { shouldDirty: true })}
      onLabelChange={(next) => form.setValue(`${base}.previewLabel` as const, next, { shouldDirty: true })}
      onDescriptionChange={() => undefined}
    /></div>
    <p className="text-xs text-muted-foreground">The saved answer and output are static for learners. No AI request happens when they click Try it or Regenerate.</p>
  </div>
}

/**
 * Returns a new empty block of the given type for useFieldArray append defaults.
 */
function defaultBlock(type: LessonBlock['type']): LessonBlock {
  switch (type) {
    case 'list':
      return { type: 'list', items: [], checkable: false }
    case 'image':
      return { type: 'image', src: '' }
    case 'video':
      return { type: 'video', src: '' }
    case 'file':
      return { type: 'file', url: '', label: '' }
    case 'link':
      return { type: 'link', url: '', label: '' }
    case 'quiz':
      return {
        type: 'quiz',
        mode: 'single',
        question: '',
        options: ['', ''],
        correctIndex: 0,
      }
    case 'submission':
      return { type: 'submission', prompt: '', acceptAttachment: false }
    case 'callout':
      return { type: 'callout', variant: 'tip', content: '' }
    case 'table':
      return { type: 'table', title: '', items: [{ label: 'First', content: '' }, { label: 'Second', content: '' }] }
    case 'guide':
      return { type: 'guide', title: 'Guide', description: '', steps: [{ title: 'First step', content: '' }, { title: 'Next step', content: '' }] }
    case 'playground':
      return { type: 'playground', title: 'AI Playground', prompt: '', answer: '', documentUrl: '', documentLabel: '', previewUrl: '', previewLabel: '' }
    case 'prompt':
      return { type: 'prompt', title: '', content: '' }
    case 'user-message':
      return { type: 'user-message', name: '', text: '' }
    case 'mentor-message':
      return { type: 'mentor-message', text: '' }
    default:
      return { type, content: '' }
  }
}
