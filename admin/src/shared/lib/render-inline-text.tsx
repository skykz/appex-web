import type { ReactNode } from 'react'
import { parseLessonInlineMarkdown } from '@appex/lesson-schema'

/**
 * Renders lesson text with `**bold**`, `""italic""`, and auto-linked URLs (admin preview).
 */
export function renderInlineText(text: string, keyPrefix = 'inline-text'): ReactNode[] {
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
          {renderInlineText(segment.value, key)}
        </strong>
      )
      return
    }

    if (segment.kind === 'italic') {
      nodes.push(
        <em key={key} className="italic">
          {renderInlineText(segment.value, key)}
        </em>
      )
      return
    }

    if (segment.kind === 'highlight') {
      const colors = { yellow: 'bg-yellow-200', green: 'bg-emerald-200', blue: 'bg-sky-200', pink: 'bg-pink-200', purple: 'bg-violet-200' }
      nodes.push(<mark key={key} className={`rounded px-1 py-0.5 text-zinc-950 ${colors[segment.color]}`}>{segment.value}</mark>)
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
