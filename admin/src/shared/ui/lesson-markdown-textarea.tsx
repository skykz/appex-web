import type { ComponentProps } from 'react'
import { Textarea } from '@shared/ui/textarea'
import { applyWordPasteToTextarea, type WordPasteMode } from '@shared/lib/word-paste'

type LessonMarkdownTextareaProps = Omit<ComponentProps<typeof Textarea>, 'onPaste'> & {
  value: string
  onValueChange: (value: string) => void
  pasteMode?: WordPasteMode
}

/**
 * Textarea for lesson copy that converts Word rich-text paste into plain text (structure preserved).
 */
export function LessonMarkdownTextarea({
  value,
  onValueChange,
  pasteMode = 'text',
  onChange,
  ...props
}: LessonMarkdownTextareaProps) {
  return (
    <Textarea
      {...props}
      value={value}
      onChange={(event) => {
        onValueChange(event.target.value)
        onChange?.(event)
      }}
      onPaste={(event) => applyWordPasteToTextarea(event, value, onValueChange, pasteMode)}
    />
  )
}
