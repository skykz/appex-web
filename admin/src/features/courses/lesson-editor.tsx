import { useState } from 'react'
import { useForm, useFieldArray, Controller, type UseFormReturn } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, GripVertical, ArrowUp, ArrowDown } from 'lucide-react'
import {
  coursesApi,
  type Lesson,
  type LessonBlock,
  type LessonStep,
} from './api'
import { Button } from '@shared/ui/button'
import { Input } from '@shared/ui/input'
import { Textarea } from '@shared/ui/textarea'
import { Label } from '@shared/ui/label'
import { Select } from '@shared/ui/select'
import { ApiError } from '@shared/api/http-client'

interface FormValues {
  label: string
  title: string
  emoji: string
  order: number
  steps: Array<{ blocks: LessonBlock[] }>
}

interface Props {
  moduleId: number
  initial?: Lesson
  onDone: () => void
}

export function LessonEditor({ moduleId, initial, onDone }: Props) {
  const qc = useQueryClient()

  const form = useForm<FormValues>({
    defaultValues: {
      label: initial?.label ?? 'Lesson 1',
      title: initial?.title ?? '',
      emoji: initial?.emoji ?? '📘',
      order: initial?.order ?? 0,
      steps:
        initial?.content && initial.content.length > 0
          ? initial.content
          : [{ blocks: [{ type: 'heading', content: '' }] }],
    },
  })

  const {
    fields: stepFields,
    append: appendStep,
    remove: removeStep,
    move: moveStep,
  } = useFieldArray({ control: form.control, name: 'steps' })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        label: values.label,
        title: values.title,
        emoji: values.emoji,
        order: Number(values.order) || 0,
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

  function onSubmit(values: FormValues) {
    // Strip empty steps
    const cleaned = {
      ...values,
      steps: values.steps.filter((s) => s.blocks.length > 0),
    }
    if (cleaned.steps.length === 0) {
      toast.error('Add at least one step with content.')
      return
    }
    mutation.mutate(cleaned)
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-[8rem_1fr_5rem_5rem] gap-3">
        <div className="space-y-1.5">
          <Label>Label</Label>
          <Input placeholder="Lesson 1" {...form.register('label')} />
        </div>
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input placeholder="Introduction" {...form.register('title')} />
        </div>
        <div className="space-y-1.5">
          <Label>Emoji</Label>
          <Input {...form.register('emoji')} />
        </div>
        <div className="space-y-1.5">
          <Label>Order</Label>
          <Input type="number" min={0} {...form.register('order')} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Steps ({stepFields.length})</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => appendStep({ blocks: [{ type: 'heading', content: '' }] })}
          >
            <Plus className="h-4 w-4" />
            Add step
          </Button>
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

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save lesson'}
        </Button>
      </div>
    </form>
  )
}

function StepBlocksEditor({
  form,
  stepIdx,
}: {
  form: UseFormReturn<FormValues>
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
  form: UseFormReturn<FormValues>
  stepIdx: number
  blockIdx: number
  total: number
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
}) {
  const type = form.watch(`steps.${stepIdx}.blocks.${blockIdx}.type`)

  return (
    <div className="rounded-md border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {type}
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

function BlockFields({
  form,
  stepIdx,
  blockIdx,
}: {
  form: UseFormReturn<FormValues>
  stepIdx: number
  blockIdx: number
}) {
  const base = `steps.${stepIdx}.blocks.${blockIdx}` as const
  const type = form.watch(`${base}.type`)

  if (type === 'list') {
    return (
      <Controller
        control={form.control}
        name={`${base}.items` as const}
        render={({ field }) => {
          const items = Array.isArray(field.value) ? field.value : []
          return (
            <Textarea
              rows={3}
              placeholder="One item per line"
              value={items.join('\n')}
              onChange={(e) =>
                field.onChange(
                  e.target.value.split('\n').map((s) => s.trimEnd()).filter(Boolean)
                )
              }
            />
          )
        }}
      />
    )
  }
  if (type === 'image') {
    return (
      <div className="grid gap-2">
        <Input
          placeholder="Image URL (https://…)"
          {...form.register(`${base}.src` as const)}
        />
        <Input
          placeholder="Alt text (optional)"
          {...form.register(`${base}.alt` as const)}
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
      <Textarea rows={2} placeholder="Mentor message" {...form.register(`${base}.text` as const)} />
    )
  }
  // text, bold-text, heading
  return (
    <Textarea
      rows={type === 'heading' ? 1 : 3}
      placeholder={type === 'heading' ? 'Heading text' : 'Paragraph text'}
      {...form.register(`${base}.content` as const)}
    />
  )
}

function defaultBlock(type: LessonBlock['type']): LessonBlock {
  switch (type) {
    case 'list':
      return { type: 'list', items: [] }
    case 'image':
      return { type: 'image', src: '' }
    case 'user-message':
      return { type: 'user-message', name: '', text: '' }
    case 'mentor-message':
      return { type: 'mentor-message', text: '' }
    default:
      return { type, content: '' }
  }
}
