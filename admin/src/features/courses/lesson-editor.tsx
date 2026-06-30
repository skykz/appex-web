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
import { Loader2, Plus, Trash2, GripVertical, ArrowUp, ArrowDown, Eye } from 'lucide-react'
import {
  lessonEditorFormSchema,
  normalizeLessonContentSteps,
  type LessonEditorFormValues,
} from '@appex/lesson-schema'
import {
  coursesApi,
  type Lesson,
  type LessonBlock,
  type LessonStep,
} from './api'
import { Button } from '@shared/ui/button'
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
  onDone: () => void
}

export function LessonEditor({ moduleId, initial, onDone }: Props) {
  const qc = useQueryClient()
  const [previewOpen, setPreviewOpen] = useState(false)

  const form = useForm<LessonEditorFormValues>({
    resolver: zodResolver(lessonEditorFormSchema) as Resolver<LessonEditorFormValues>,
    mode: 'onSubmit',
    defaultValues: {
      label: initial?.label ?? 'Lesson 1',
      title: initial?.title ?? '',
      emoji: initial?.emoji ?? '📘',
      is_visible: initial?.is_visible ?? false,
      order: initial?.order ?? 0,
      steps: normalizeLessonStepsFromApi(initial?.content),
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
                <input type="checkbox" className="size-3.5" {...form.register('is_visible')} />
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
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    Step {stepIdx + 1}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={stepIdx === 0}
                      onClick={() => moveStep(stepIdx, stepIdx - 1)}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={stepIdx === stepFields.length - 1}
                      onClick={() => moveStep(stepIdx, stepIdx + 1)}
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
          <option value="bold-text">Bold text</option>
          <option value="list">List</option>
          <option value="image">Image</option>
          <option value="video">Video</option>
          <option value="file">Download file</option>
          <option value="quiz">Quiz</option>
          <option value="submission">Student submission</option>
          <option value="callout">Callout</option>
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
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={blockIdx === total - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </div>
      <BlockFields form={form} stepIdx={stepIdx} blockIdx={blockIdx} />
    </div>
  )
}

/** Hint shown under text fields that support `**bold**` markdown. */
function InlineMarkdownHint() {
  return (
    <p className="text-xs text-muted-foreground">
      Use <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">**bold text**</code> for emphasis, or paste from Word — bold formatting is kept.
    </p>
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
      <div className="grid gap-1">
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
    const optionsVal = (form.watch(`${base}.options` as const) as string[] | undefined) ?? []

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
          <>
            <Controller
              control={form.control}
              name={`${base}.options` as const}
              render={({ field }) => {
                const items = Array.isArray(field.value) ? field.value : []
                return (
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">Options (one per line, min 2)</Label>
                    <Textarea
                      rows={5}
                      placeholder={'Option A\nOption B\nOption C'}
                      value={items.join('\n')}
                      onChange={(e) =>
                        field.onChange(e.target.value.split('\n').map((s) => s.trimEnd()))
                      }
                    />
                  </div>
                )
              }}
            />
            {mode === 'single' ? (
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">Correct answer</Label>
                {optionsVal.map((opt: string, idx: number) => (
                  <label
                    key={idx}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm"
                  >
                    <input
                      type="radio"
                      name={`quiz-correct-${stepIdx}-${blockIdx}`}
                      checked={Number(form.watch(`${base}.correctIndex`)) === idx}
                      onChange={() => form.setValue(`${base}.correctIndex`, idx)}
                    />
                    <span className="min-w-0 truncate">{opt.trim() || `Row ${idx + 1} (empty)`}</span>
                  </label>
                ))}
              </div>
            ) : (
              <Controller
                control={form.control}
                name={`${base}.correctIndices` as const}
                render={({ field }) => {
                  const correct = new Set(Array.isArray(field.value) ? field.value : [])
                  return (
                    <div className="grid gap-2">
                      <Label className="text-xs text-muted-foreground">Mark all correct options</Label>
                      {optionsVal.map((opt: string, idx: number) => (
                        <label
                          key={idx}
                          className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={correct.has(idx)}
                            onChange={() => {
                              const next = new Set(correct)
                              if (next.has(idx)) next.delete(idx)
                              else next.add(idx)
                              field.onChange([...next].sort((a, b) => a - b))
                            }}
                          />
                          <span className="min-w-0 truncate">{opt.trim() || `Row ${idx + 1}`}</span>
                        </label>
                      ))}
                    </div>
                  )
                }}
              />
            )}
          </>
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
              <input
                type="checkbox"
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

/**
 * Returns a new empty block of the given type for useFieldArray append defaults.
 */
function defaultBlock(type: LessonBlock['type']): LessonBlock {
  switch (type) {
    case 'list':
      return { type: 'list', items: [] }
    case 'image':
      return { type: 'image', src: '' }
    case 'video':
      return { type: 'video', src: '' }
    case 'file':
      return { type: 'file', url: '', label: '' }
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
