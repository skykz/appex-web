import type { ReactNode } from 'react'

const URL_PATTERN = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi
const TRAILING_PUNCTUATION_PATTERN = /[),.!?:;]+$/

/**
 * Splits trailing punctuation from a detected URL so sentence punctuation stays outside the link.
 */
function splitTrailingPunctuation(url: string): { hrefText: string; trailing: string } {
  const match = url.match(TRAILING_PUNCTUATION_PATTERN)
  if (!match) return { hrefText: url, trailing: '' }

  return {
    hrefText: url.slice(0, -match[0].length),
    trailing: match[0],
  }
}

/**
 * Renders plain text while turning pasted URLs into clearly visible external links.
 */
export function renderLinkedText(text: string, keyPrefix = 'linked-text'): ReactNode[] {
  const nodes: ReactNode[] = []
  let lastIndex = 0

  for (const match of text.matchAll(URL_PATTERN)) {
    const rawUrl = match[0]
    const index = match.index ?? 0

    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index))
    }

    const { hrefText, trailing } = splitTrailingPunctuation(rawUrl)
    const href = hrefText.startsWith('www.') ? `https://${hrefText}` : hrefText

    nodes.push(
      <a
        key={`${keyPrefix}-${index}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-primary underline decoration-primary/45 underline-offset-4 transition-colors hover:text-primary/80 hover:decoration-primary"
      >
        {hrefText}
      </a>
    )

    if (trailing) nodes.push(trailing)
    lastIndex = index + rawUrl.length
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}
