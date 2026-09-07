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

    if (segment.kind === 'highlight') {
      const colors = {
        yellow: 'bg-yellow-200/80 text-yellow-950 dark:bg-yellow-500/30 dark:text-yellow-50',
        green: 'bg-emerald-200/80 text-emerald-950 dark:bg-emerald-500/30 dark:text-emerald-50',
        blue: 'bg-sky-200/80 text-sky-950 dark:bg-sky-500/30 dark:text-sky-50',
        pink: 'bg-pink-200/80 text-pink-950 dark:bg-pink-500/30 dark:text-pink-50',
        purple: 'bg-violet-200/80 text-violet-950 dark:bg-violet-500/30 dark:text-violet-50',
      }
      nodes.push(<mark key={key} className={`rounded px-1 py-0.5 ${colors[segment.color]}`}>{segment.value}</mark>)
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
