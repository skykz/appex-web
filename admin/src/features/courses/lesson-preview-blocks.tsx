import type { ReactNode } from 'react'
import type { LessonBlockLearner } from '@appex/lesson-schema'
import { LessonFileDownloadCard } from '@shared/ui/lesson-file-download-card'
import { cn } from '@shared/lib'
import { renderInlineText } from '@shared/lib/render-inline-text'
import { CopyPromptCard } from '@shared/ui/copy-prompt-card'
import {
  PreviewMentorMessageBlock,
  PreviewUserMessageBlock,
} from '@shared/ui/lesson-chat-message-blocks'

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
              {renderInlineText(run.content, `${keyPrefix}-${idx}-${runIdx}`)}
            </strong>
          ) : (
            <span key={runIdx}>
              {renderInlineText(run.content, `${keyPrefix}-${idx}-${runIdx}`)}
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
      <p className="whitespace-pre-wrap">{renderInlineText(content, 'callout-preview')}</p>
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
        <LessonFileDownloadCard
          key={`file-${i}`}
          url={block.url}
          label={block.label}
          description={block.description}
        />
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

    if (block.type === 'prompt') {
      elements.push(
        <CopyPromptCard
          key={`prompt-${i}`}
          className="mt-5 first:mt-0"
          title={block.title}
          content={block.content}
        />
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
              {renderInlineText(item, `list-${i}-${idx}`)}
            </li>
          ))}
        </ul>
      )
      i++
      continue
    }

    if (block.type === 'user-message') {
      elements.push(
        <PreviewUserMessageBlock key={`user-${i}`} name={block.name}>
          {block.text}
        </PreviewUserMessageBlock>
      )
      i++
      continue
    }

    if (block.type === 'mentor-message') {
      elements.push(
        <PreviewMentorMessageBlock key={`mentor-${i}`}>
          {renderInlineText(block.text, `mentor-${i}`)}
        </PreviewMentorMessageBlock>
      )
      i++
      continue
    }

    i++
  }

  return <div className="flex flex-col gap-5 [&>*]:mt-0">{elements}</div>
}
