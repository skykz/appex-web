import type { ReactNode } from 'react'
import { parseLessonInlineMarkdown } from '@appex/lesson-schema'

/**
 * Renders lesson text with `**bold**`, `""italic""`, and auto-linked URLs.
 */
export function renderLinkedText(text: string, keyPrefix = 'linked-text'): ReactNode[] {
  const segments = parseLessonInlineMarkdown(text)
  const nodes: ReactNode[] = []

  segments.forEach((segment, index) => {
    const key = `${keyPrefix}-${index}`

    if (segment.kind === 'text') {
      if (segment.value) nodes.push(segment.value)
      return
    }

    if (segment.kind === 'bold') {
      nodes.push(
        <strong key={key} className="font-semibold">
          {renderLinkedText(segment.value, key)}
        </strong>
      )
      return
    }

    if (segment.kind === 'italic') {
      nodes.push(
        <em key={key} className="italic">
          {renderLinkedText(segment.value, key)}
        </em>
      )
      return
    }

    nodes.push(
      <a
        key={key}
        href={segment.href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-primary underline decoration-primary/45 underline-offset-4 transition-colors hover:text-primary/80 hover:decoration-primary"
      >
        {segment.label}
      </a>
    )
  })

  return nodes
}
