import { useRef } from 'react'
import { Controller, useFieldArray, useWatch, type UseFormReturn } from 'react-hook-form'
import type { LessonEditorFormValues } from '@appex/lesson-schema'
import { Button } from '@shared/ui/button'
import { Input } from '@shared/ui/input'
import { LessonMarkdownTextarea } from '@shared/ui/lesson-markdown-textarea'
import { ImageSrcField } from '@shared/ui/image-src-field'

type Form = UseFormReturn<LessonEditorFormValues>
type Base = `steps.${number}.blocks.${number}`

export function GuideFields({ form, base }: { form: Form; base: Base }) {
  const { fields, append, remove, move } = useFieldArray({ control: form.control, name: `${base}.steps` })
  return <div className="grid gap-3">
    <Input aria-label="Guide title" placeholder="Guide title" {...form.register(`${base}.title`)} />
    <Controller control={form.control} name={`${base}.description`} render={({ field }) => (
      <LessonMarkdownTextarea rows={2} placeholder="Introduction (optional)" value={field.value ?? ''} onValueChange={field.onChange} />
    )} />
    <p className="text-xs text-muted-foreground">Add text and images in any order within each step. Use **bold** or ""italic"" in text.</p>
    {fields.map((step, index) => <div key={step.id} className="grid gap-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Guide step {index + 1}</span>
        <OrderButtons label={`guide step ${index + 1}`} index={index} total={fields.length} onMove={(to) => move(index, to)} onRemove={() => remove(index)} minimum={2} />
      </div>
      <Input aria-label={`Guide step ${index + 1} title`} placeholder="Step title" {...form.register(`${base}.steps.${index}.title`)} />
      <GuideStepParts key={step.id} form={form} base={`${base}.steps.${index}`} />
    </div>)}
    <Button type="button" variant="outline" disabled={fields.length >= 20} onClick={() => append({ title: '', blocks: [{ type: 'text', content: '' }] })}>Add guide step</Button>
  </div>
}

function OrderButtons({ label, index, total, onMove, onRemove, minimum = 1 }: {
  label: string; index: number; total: number; onMove: (to: number) => void; onRemove: () => void; minimum?: number
}) {
  return <div className="ml-auto flex gap-1">
    <Button type="button" size="sm" variant="ghost" aria-label={`Move ${label} up`} disabled={index === 0} onClick={() => onMove(index - 1)}>↑</Button>
    <Button type="button" size="sm" variant="ghost" aria-label={`Move ${label} down`} disabled={index === total - 1} onClick={() => onMove(index + 1)}>↓</Button>
    <Button type="button" size="sm" variant="ghost" aria-label={`Remove ${label}`} disabled={total <= minimum} onClick={onRemove}>Remove</Button>
  </div>
}

function GuideStepParts({ form, base }: { form: Form; base: `${Base}.steps.${number}` }) {
  const { fields, append, remove, move } = useFieldArray({ control: form.control, name: `${base}.blocks` })
  const parts = useWatch({ control: form.control, name: `${base}.blocks` })
  return <div className="grid gap-3">
    {fields.map((part, index) => <div key={part.id} className="grid gap-2 rounded-md border bg-background p-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">{parts?.[index]?.type === 'image' ? 'Image' : 'Text'}</span>
        <OrderButtons label={`section ${index + 1}`} index={index} total={fields.length} onMove={(to) => move(index, to)} onRemove={() => remove(index)} />
      </div>
      {parts?.[index]?.type === 'image' ? <>
        <Controller control={form.control} name={`${base}.blocks.${index}.src`} render={({ field }) => <ImageSrcField value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} />} />
        <Input aria-label="Image alt text" placeholder="Alt text (optional)" {...form.register(`${base}.blocks.${index}.alt`)} />
      </> : <Controller control={form.control} name={`${base}.blocks.${index}.content`} render={({ field }) => (
        <GuideTextField value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} />
      )} />}
    </div>)}
    <div className="flex gap-2">
      <Button type="button" size="sm" variant="outline" onClick={() => append({ type: 'text', content: '' })}>Add text</Button>
      <Button type="button" size="sm" variant="outline" onClick={() => append({ type: 'image', src: '', alt: '' })}>Add image</Button>
    </div>
  </div>
}

function GuideTextField({ value, onChange, onBlur }: { value: string; onChange: (value: string) => void; onBlur: () => void }) {
  const input = useRef<HTMLTextAreaElement>(null)
  function format(marker: string, placeholder: string) {
    const textarea = input.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = value.slice(start, end) || placeholder
    onChange(value.slice(0, start) + marker + selected + marker + value.slice(end))
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(start + marker.length, start + marker.length + selected.length)
    })
  }
  return <div className="grid gap-1">
    <div className="flex gap-1" role="group" aria-label="Text formatting">
      <Button type="button" size="sm" variant="outline" className="font-bold" onClick={() => format('**', 'bold text')}>Bold</Button>
      <Button type="button" size="sm" variant="outline" className="italic" onClick={() => format('""', 'italic text')}>Italic</Button>
    </div>
    <LessonMarkdownTextarea ref={input} aria-label="Guide step text" rows={5} placeholder="Write text before or after an image…" value={value} onValueChange={onChange} onBlur={onBlur} />
  </div>
}
