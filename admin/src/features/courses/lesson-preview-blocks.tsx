import type { ReactNode } from 'react'
import type { LessonBlockLearner } from '@appex/lesson-schema'
import { ExternalLink, FileText } from 'lucide-react'
import { cn } from '@shared/lib'

const URL_PATTERN = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi
const TRAILING_PUNCTUATION_PATTERN = /[),.!?:;]+$/

/**
 * Splits punctuation from the end of a URL so preview links do not swallow commas or periods.
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
 * Mirrors the learner view by making pasted URLs visibly clickable in preview text.
 */
function renderLinkedText(text: string, keyPrefix = 'linked-text'): ReactNode[] {
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

/**
 * Resolves a YouTube page or short link to a standard embed URL for an iframe (matches learner app).
 */
function youtubeEmbedSrc(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0]
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtube-nocookie.com'
    ) {
      const v = u.searchParams.get('v')
      if (v) return `https://www.youtube.com/embed/${v}`
      const embed = u.pathname.match(/\/embed\/([^/?]+)/)
      if (embed) return `https://www.youtube.com/embed/${embed[1]}`
      const shorts = u.pathname.match(/\/shorts\/([^/?]+)/)
      if (shorts) return `https://www.youtube.com/embed/${shorts[1]}`
    }
  } catch {
    /* ignore */
  }
  return null
}

/**
 * Resolves a Vimeo watch URL to the player iframe src (matches learner app).
 */
function vimeoEmbedSrc(url: string): string | null {
  try {
    const u = new URL(url)
    if (!u.hostname.includes('vimeo.com')) return null
    const m = u.pathname.match(/\/(?:video\/)?(\d+)/)
    return m ? `https://player.vimeo.com/video/${m[1]}` : null
  } catch {
    return null
  }
}

/**
 * Chooses iframe embed vs native HTML5 video for a lesson video block.
 */
function videoPresentation(
  src: string
): { mode: 'iframe'; href: string } | { mode: 'video'; href: string } | null {
  const t = src.trim()
  if (!t) return null
  const yt = youtubeEmbedSrc(t)
  if (yt) return { mode: 'iframe', href: yt }
  const vm = vimeoEmbedSrc(t)
  if (vm) return { mode: 'iframe', href: vm }
  return { mode: 'video', href: t }
}

type QuizBlock =
  | Extract<LessonBlockLearner, { type: 'quiz' }>
  | Extract<LessonBlockLearner, { type: 'quiz-single' }>
  | Extract<LessonBlockLearner, { type: 'quiz-multi' }>

/**
 * Renders text content with blank lines as paragraph breaks, matching the learner lesson view.
 */
function renderTextParagraphs(
  keyPrefix: string,
  runs: Array<{ content: string; bold: boolean }>
): ReactNode[] {
  const groups: Array<Array<{ content: string; bold: boolean }>> = [[]]

  for (const run of runs) {
    const parts = run.content.split(/(\r?\n\s*\r?\n)/)
    for (const part of parts) {
      if (!part) continue
      if (/\r?\n\s*\r?\n/.test(part)) {
        groups.push([])
        continue
      }
      groups[groups.length - 1]!.push({ ...run, content: part })
    }
  }

  return groups
    .filter((group) => group.some((run) => run.content.trim().length > 0))
    .map((group, idx) => (
      <p
        key={`${keyPrefix}-${idx}`}
        className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed first:mt-0"
      >
        {group.map((run, runIdx) =>
          run.bold ? (
            <strong key={runIdx} className="font-semibold">
              {renderLinkedText(run.content, `${keyPrefix}-${idx}-${runIdx}`)}
            </strong>
          ) : (
            <span key={runIdx}>
              {renderLinkedText(run.content, `${keyPrefix}-${idx}-${runIdx}`)}
            </span>
          )
        )}
      </p>
    ))
}

/**
 * Derives quiz interaction mode from unified or legacy quiz blocks.
 */
function getQuizPreviewMode(block: QuizBlock): 'single' | 'multi' | 'open' {
  if (block.type === 'quiz') return block.mode
  if (block.type === 'quiz-single') return 'single'
  return 'multi'
}

/**
 * Returns choice labels for quiz preview (non–open modes).
 */
function getQuizPreviewOptions(block: QuizBlock): string[] {
  if (block.type === 'quiz') {
    if (block.mode === 'open') return []
    return block.options
  }
  return block.options
}

/**
 * Renders callout styling aligned with the learner lesson surface.
 */
function CalloutPreview({
  variant,
  title,
  content,
}: {
  variant: 'tip' | 'note' | 'warn'
  title?: string
  content: string
}) {
  const tone =
    variant === 'warn'
      ? 'border-amber-500/50 bg-amber-50/80 text-amber-950 dark:bg-amber-950/30 dark:text-amber-50'
      : variant === 'tip'
        ? 'border-emerald-500/40 bg-emerald-50/70 text-emerald-950 dark:bg-emerald-950/25 dark:text-emerald-50'
        : 'border-sky-500/40 bg-sky-50/70 text-sky-950 dark:bg-sky-950/25 dark:text-sky-50'
  return (
    <div className={cn('mt-5 rounded-xl border px-4 py-3 text-[15px] leading-relaxed first:mt-0', tone)}>
      {title ? <p className="mb-1 text-sm font-semibold">{title}</p> : null}
      <p className="whitespace-pre-wrap">{renderLinkedText(content, 'callout-preview')}</p>
    </div>
  )
}

/**
 * Read-only quiz surface: shows learner-visible fields only (answers never appear in admin preview).
 */
function QuizPreviewReadonly({ block }: { block: QuizBlock }) {
  const mode = getQuizPreviewMode(block)
  const options = getQuizPreviewOptions(block)
  return (
    <div className="mt-6 space-y-3 rounded-2xl border border-border/70 bg-muted/25 p-4 first:mt-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quiz (preview)</p>
      <p className="text-[15px] font-medium leading-snug text-foreground">{block.question}</p>
      {mode === 'open' ? (
        <p className="text-sm text-muted-foreground">Open-ended response — learners type an answer in the app.</p>
      ) : (
        <ul className="space-y-2">
          {options.map((opt, idx) => (
            <li
              key={idx}
              className="rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm text-muted-foreground"
            >
              {opt || <span className="italic">(empty option)</span>}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        Correct answers and server checks run only in the learner app — this is a layout preview.
      </p>
    </div>
  )
}

/**
 * Renders one step’s blocks as learners roughly see them (static; no API calls).
 */
export function LessonPreviewBlocks({ blocks }: { blocks: LessonBlockLearner[] }) {
  const elements: ReactNode[] = []
  let i = 0

  while (i < blocks.length) {
    const block = blocks[i]

    if (block.type === 'heading') {
      elements.push(
        <h2
          key={`h-${i}`}
          className="mt-8 border-b border-border/60 pb-2 text-2xl font-bold tracking-tight text-foreground first:mt-0"
        >
          {block.content}
        </h2>
      )
      i++
      continue
    }

    if (block.type === 'image') {
      elements.push(
        <div key={`img-${i}`} className="mt-4 overflow-hidden rounded-2xl bg-muted/40">
          <img src={block.src} alt={block.alt ?? ''} className="h-auto w-full object-cover" />
        </div>
      )
      i++
      continue
    }

    if (block.type === 'video') {
      const pres = videoPresentation(block.src)
      elements.push(
        <div key={`vid-${i}`} className="mt-5 space-y-2 first:mt-0">
          {block.title ? <p className="text-sm font-semibold text-foreground">{block.title}</p> : null}
          {pres ? (
            pres.mode === 'iframe' ? (
              <div className="aspect-video overflow-hidden rounded-2xl bg-muted/40">
                <iframe
                  title={block.title ?? 'Video'}
                  src={pres.href}
                  className="h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            ) : (
              <video controls className="mt-1 w-full rounded-2xl bg-black" src={pres.href} />
            )
          ) : (
            <p className="text-sm text-muted-foreground">Video URL missing.</p>
          )}
          {block.caption ? <p className="text-xs text-muted-foreground">{block.caption}</p> : null}
        </div>
      )
      i++
      continue
    }

    if (block.type === 'file') {
      elements.push(
        <a
          key={`file-${i}`}
          href={block.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-5 flex items-start gap-3 rounded-2xl border border-blue-500/70 bg-zinc-950 px-4 py-3 text-left text-zinc-50 no-underline shadow-sm transition-colors hover:border-blue-400 hover:bg-zinc-900 first:mt-0"
        >
          <FileText className="mt-0.5 size-5 shrink-0 text-blue-300" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold leading-snug">{block.label}</span>
            {block.description ? (
              <span className="mt-1 block text-xs leading-relaxed text-zinc-400">{block.description}</span>
            ) : null}
            <span className="mt-2 flex min-w-0 items-center gap-2 text-xs font-semibold text-blue-300">
              <ExternalLink className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate underline decoration-blue-300/60 underline-offset-4 group-hover:decoration-blue-200">
                {block.url}
              </span>
            </span>
          </span>
        </a>
      )
      i++
      continue
    }

    if (block.type === 'quiz' || block.type === 'quiz-single' || block.type === 'quiz-multi') {
      elements.push(<QuizPreviewReadonly key={`quiz-${i}`} block={block} />)
      i++
      continue
    }

    if (block.type === 'submission') {
      elements.push(
        <div
          key={`sub-${i}`}
          className="mt-6 space-y-2 rounded-2xl border border-dashed border-primary/40 bg-primary/[0.04] p-4 first:mt-0"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Student submission</p>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{block.prompt}</p>
          <p className="text-xs text-muted-foreground">
            Learners send messages here in the app
            {block.acceptAttachment ? ' (file uploads allowed).' : '.'}
          </p>
        </div>
      )
      i++
      continue
    }

    if (block.type === 'callout') {
      elements.push(
        <CalloutPreview key={`co-${i}`} variant={block.variant} title={block.title} content={block.content} />
      )
      i++
      continue
    }

    if (block.type === 'text' || block.type === 'bold-text') {
      const textRuns: Array<{ content: string; bold: boolean }> = []
      let j = i
      while (j < blocks.length && (blocks[j].type === 'text' || blocks[j].type === 'bold-text')) {
        const b = blocks[j]
        if (b.type === 'bold-text') {
          textRuns.push({ content: b.content, bold: true })
        } else if (b.type === 'text') {
          textRuns.push({ content: b.content, bold: false })
        }
        j++
      }
      elements.push(
        <div key={`p-${i}`} className="mt-5 first:mt-0">
          {renderTextParagraphs(`p-${i}`, textRuns)}
        </div>
      )
      i = j
      continue
    }

    if (block.type === 'list') {
      elements.push(
        <ul key={`list-${i}`} className="ml-6 mt-4 flex list-disc flex-col gap-1.5">
          {block.items.map((item, idx) => (
            <li key={idx} className="text-[15px] leading-relaxed">
              {renderLinkedText(item, `list-${i}-${idx}`)}
            </li>
          ))}
        </ul>
      )
      i++
      continue
    }

    if (block.type === 'user-message') {
      elements.push(
        <div key={`user-${i}`} className="mt-8 flex flex-col items-end gap-1.5">
          <span className="text-xs text-muted-foreground">{block.name}</span>
          <div className="flex items-end gap-2.5">
            <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-[15px] leading-relaxed text-primary-foreground">
              {block.text}
            </div>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 text-xs font-semibold text-white">
              {block.name.charAt(0)}
            </div>
          </div>
        </div>
      )
      i++
      continue
    }

    if (block.type === 'mentor-message') {
      elements.push(
        <div key={`mentor-${i}`} className="mt-5 flex flex-col items-start gap-1.5">
          <span className="text-xs text-muted-foreground">Mentor</span>
          <div className="flex items-end gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 text-xs font-semibold text-white">
              M
            </div>
            <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-muted px-4 py-3 text-[15px] leading-relaxed">
              {renderLinkedText(block.text, `mentor-${i}`)}
            </div>
          </div>
        </div>
      )
      i++
      continue
    }

    i++
  }

  return <div className="flex flex-col gap-5 [&>*]:mt-0">{elements}</div>
}
