const URL_PATTERN = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi
const BOLD_ITALIC_PATTERN = /\*""([^"\n]+)""\*/g
const BOLD_PATTERN = /\*\*([^*\n]+)\*\*/g
const ITALIC_PATTERN = /""([^"\n]+)""/g
const TRAILING_PUNCTUATION_PATTERN = /[),.!?:;]+$/

export type LessonInlineSegment =
  | { kind: 'text'; value: string }
  | { kind: 'bold'; value: string }
  | { kind: 'italic'; value: string }
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
 * Parses URLs inside a plain text chunk (no emphasis markers).
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
 * Parses `""italic""` spans inside a plain text chunk.
 */
function parseItalicSegments(text: string): LessonInlineSegment[] {
  if (!text) return []

  const segments: LessonInlineSegment[] = []
  let lastIndex = 0

  for (const match of text.matchAll(ITALIC_PATTERN)) {
    const index = match.index ?? 0

    if (index > lastIndex) {
      segments.push(...parseUrlSegments(text.slice(lastIndex, index)))
    }

    segments.push({ kind: 'italic', value: match[1] ?? '' })
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

/**
 * Parses inline emphasis markers (`*""bold italic""*`, `**bold**`, `""italic""`) in a text chunk.
 */
function parseEmphasisSegments(text: string): LessonInlineSegment[] {
  if (!text) return []

  const segments: LessonInlineSegment[] = []
  let lastIndex = 0

  const patterns: Array<{
    regex: RegExp
    map: (value: string) => LessonInlineSegment
  }> = [
    {
      regex: BOLD_ITALIC_PATTERN,
      map: (value) => ({ kind: 'bold', value: `""${value}""` }),
    },
    {
      regex: BOLD_PATTERN,
      map: (value) => ({ kind: 'bold', value }),
    },
  ]

  for (;;) {
    let nextMatch: RegExpMatchArray | null = null
    let nextPattern: (typeof patterns)[number] | null = null

    for (const pattern of patterns) {
      pattern.regex.lastIndex = lastIndex
      const match = pattern.regex.exec(text)
      if (!match) continue
      if (!nextMatch || (match.index ?? 0) < (nextMatch.index ?? 0)) {
        nextMatch = match
        nextPattern = pattern
      }
    }

    if (!nextMatch || !nextPattern) break

    const index = nextMatch.index ?? 0

    if (index > lastIndex) {
      segments.push(...parseItalicSegments(text.slice(lastIndex, index)))
    }

    segments.push(nextPattern.map(nextMatch[1] ?? ''))
    lastIndex = index + nextMatch[0].length
  }

  if (lastIndex < text.length) {
    segments.push(...parseItalicSegments(text.slice(lastIndex)))
  }

  if (segments.length === 0) {
    return parseItalicSegments(text)
  }

  return segments
}

/**
 * Parses lesson inline markdown: `**bold**`, `""italic""`, and auto-linked URLs.
 * Used by the learner app and admin lesson preview.
 */
export function parseLessonInlineMarkdown(text: string): LessonInlineSegment[] {
  if (!text) return []
  return parseEmphasisSegments(text)
}
