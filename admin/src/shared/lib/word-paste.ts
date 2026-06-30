import type { ClipboardEvent } from 'react'

export type WordPasteMode = 'text' | 'list'

/**
 * Returns true when a Word/Office HTML element should render as bold lesson markdown.
 */
function isBoldElement(element: Element): boolean {
  const tag = element.tagName.toLowerCase()
  if (tag === 'b' || tag === 'strong') return true
  if (tag !== 'span' && tag !== 'p') return false

  const style = (element.getAttribute('style') ?? '').toLowerCase()
  if (/mso-bidi-font-weight\s*:\s*bold/.test(style)) return true
  if (/font-weight\s*:\s*bold/.test(style)) return true

  const weight = style.match(/font-weight\s*:\s*(\d+)/)?.[1]
  if (weight && Number(weight) >= 600) return true

  return false
}

/**
 * Serializes a Word/HTML DOM subtree into lesson markdown (`**bold**`, line breaks).
 */
function serializeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? '').replace(/\u00a0/g, ' ')
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const element = node as Element
  const tag = element.tagName.toLowerCase()

  if (tag === 'br') return '\n'

  if (tag === 'li') {
    const inner = serializeChildren(element).trim()
    return inner ? `${inner}\n` : ''
  }

  if (tag === 'p' || tag === 'div' || tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') {
    const inner = serializeChildren(element).trim()
    return inner ? `${inner}\n\n` : ''
  }

  if (tag === 'ul' || tag === 'ol' || tag === 'tbody' || tag === 'table') {
    return serializeChildren(element)
  }

  if (isBoldElement(element)) {
    const inner = serializeChildren(element).trim()
    if (!inner) return ''
    return `**${inner}**`
  }

  return serializeChildren(element)
}

/**
 * Walks child nodes and concatenates their serialized lesson text.
 */
function serializeChildren(element: Element): string {
  return Array.from(element.childNodes).map(serializeNode).join('')
}

/**
 * Normalizes pasted lesson text after HTML conversion (Word line endings, spacing).
 */
function normalizeLessonText(text: string, mode: WordPasteMode): string {
  let normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')

  if (mode === 'list') {
    return normalized
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n')
  }

  normalized = normalized.replace(/\n{3,}/g, '\n\n')
  return normalized.trimEnd()
}

/**
 * Converts Word/Google Docs clipboard HTML into lesson markdown supported by the app.
 */
export function convertWordHtmlToLessonText(html: string, mode: WordPasteMode = 'text'): string {
  const trimmed = html.trim()
  if (!trimmed) return ''

  const doc = new DOMParser().parseFromString(trimmed, 'text/html')
  const serialized = serializeChildren(doc.body)
  return normalizeLessonText(serialized, mode)
}

/**
 * Inserts converted paste text at the current textarea selection.
 */
export function insertTextAtSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  insert: string
): { nextValue: string; cursor: number } {
  const nextValue = value.slice(0, selectionStart) + insert + value.slice(selectionEnd)
  return { nextValue, cursor: selectionStart + insert.length }
}

/**
 * Intercepts Word rich-text paste and inserts lesson markdown at the caret.
 */
export function applyWordPasteToTextarea(
  event: ClipboardEvent<HTMLTextAreaElement>,
  currentValue: string,
  onValueChange: (value: string) => void,
  mode: WordPasteMode = 'text'
): void {
  const html = event.clipboardData.getData('text/html')
  if (!html.trim()) return

  const converted = convertWordHtmlToLessonText(html, mode)
  if (!converted) return

  event.preventDefault()

  const textarea = event.currentTarget
  const { nextValue, cursor } = insertTextAtSelection(
    currentValue,
    textarea.selectionStart ?? currentValue.length,
    textarea.selectionEnd ?? currentValue.length,
    converted
  )

  onValueChange(nextValue)

  requestAnimationFrame(() => {
    textarea.selectionStart = cursor
    textarea.selectionEnd = cursor
    textarea.focus()
  })
}
