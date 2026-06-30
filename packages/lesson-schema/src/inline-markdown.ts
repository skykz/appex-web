const URL_PATTERN = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi
const BOLD_PATTERN = /\*\*([^*\n]+)\*\*/g
const TRAILING_PUNCTUATION_PATTERN = /[),.!?:;]+$/

export type LessonInlineSegment =
  | { kind: 'text'; value: string }
  | { kind: 'bold'; value: string }
  | { kind: 'link'; href: string; label: string }

/**
 * Strips trailing punctuation from a detected URL so commas stay outside the link.
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
 * Parses URLs inside a plain text chunk (no `**bold**` markers).
 */
function parseUrlSegments(text: string): LessonInlineSegment[] {
  if (!text) return []

  const segments: LessonInlineSegment[] = []
  let lastIndex = 0

  for (const match of text.matchAll(URL_PATTERN)) {
    const rawUrl = match[0]
    const index = match.index ?? 0

    if (index > lastIndex) {
      segments.push({ kind: 'text', value: text.slice(lastIndex, index) })
    }

    const { hrefText, trailing } = splitTrailingPunctuation(rawUrl)
    const href = hrefText.startsWith('www.') ? `https://${hrefText}` : hrefText

    segments.push({ kind: 'link', href, label: hrefText })
    if (trailing) segments.push({ kind: 'text', value: trailing })

    lastIndex = index + rawUrl.length
  }

  if (lastIndex < text.length) {
    segments.push({ kind: 'text', value: text.slice(lastIndex) })
  }

  return segments
}

/**
 * Parses lesson inline markdown: `**bold**` spans and auto-linked URLs.
 * Used by the learner app and admin lesson preview.
 */
export function parseLessonInlineMarkdown(text: string): LessonInlineSegment[] {
  if (!text) return []

  const segments: LessonInlineSegment[] = []
  let lastIndex = 0

  for (const match of text.matchAll(BOLD_PATTERN)) {
    const index = match.index ?? 0

    if (index > lastIndex) {
      segments.push(...parseUrlSegments(text.slice(lastIndex, index)))
    }

    segments.push({ kind: 'bold', value: match[1] ?? '' })
    lastIndex = index + match[0].length
  }

  if (lastIndex < text.length) {
    segments.push(...parseUrlSegments(text.slice(lastIndex)))
  }

  if (segments.length === 0) {
    return parseUrlSegments(text)
  }

  return segments
}
