import { useState, type ReactNode } from 'react'
import type { LessonBlockLearner } from '@appex/lesson-schema'
import { LessonFileDownloadCard } from '@shared/ui/lesson-file-download-card'
import { LessonLinkCard } from '@shared/ui/lesson-link-card'
import { cn } from '@shared/lib'
import { renderInlineText } from '@shared/lib/render-inline-text'
import { CopyPromptCard } from '@shared/ui/copy-prompt-card'
import { Check, ChevronDown, Copy, ExternalLink, FileText, Info, Lightbulb, Maximize2, Minimize2, PanelRightClose, PanelRightOpen, Paperclip, RotateCcw, Sparkles, TriangleAlert } from 'lucide-react'
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
  defaultOpen,
}: {
  variant: 'tip' | 'note' | 'warn'
  title?: string
  content: string
  defaultOpen?: boolean
}) {
  const isExpandable = variant === 'tip'
  const [open, setOpen] = useState(isExpandable ? (defaultOpen ?? false) : true)
  const styles = {
    tip: { frame: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white', rail: 'bg-emerald-500', icon: 'bg-emerald-100 text-emerald-700 ring-emerald-200', text: 'Tip', Icon: Lightbulb },
    note: { frame: 'border-orange-200 bg-gradient-to-br from-orange-50 to-white', rail: 'bg-orange-500', icon: 'bg-orange-100 text-orange-700 ring-orange-200', text: 'Note', Icon: Info },
    warn: { frame: 'border-amber-300 bg-gradient-to-br from-amber-50 to-white', rail: 'bg-amber-500', icon: 'bg-amber-100 text-amber-800 ring-amber-200', text: 'Important', Icon: TriangleAlert },
  } as const
  const style = styles[variant]
  const Icon = style.Icon
  return (
    <div className={cn('relative mt-5 overflow-hidden rounded-2xl border px-4 py-3 shadow-[0_8px_24px_-18px_rgba(0,0,0,0.35)] first:mt-0', style.frame)}>
      <span className={cn('absolute inset-y-0 left-0 w-1', style.rail)} aria-hidden />
      {isExpandable ? <button type="button" className="flex w-full items-center gap-2.5 text-left" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg ring-1', style.icon)} title={style.text}><Icon className="size-4" aria-hidden /></span>
        <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-zinc-950">{title || style.text}</span>
        <ChevronDown className={cn('size-4 shrink-0 text-zinc-500 transition-transform', open && 'rotate-180')} aria-hidden />
      </button> : <div className="flex items-center gap-2.5">
        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg ring-1', style.icon)} title={style.text}><Icon className="size-4" aria-hidden /></span>
        <span className="text-[15px] font-semibold leading-snug text-zinc-950">{title || style.text}</span>
      </div>}
      {open ? <p className="mt-2.5 whitespace-pre-wrap text-[15px] leading-7 text-zinc-800">{renderInlineText(content, 'callout-preview')}</p> : null}
    </div>
  )
}

function TablePreview({ block }: { block: Extract<LessonBlockLearner, { type: 'table' }> }) {
  const [active, setActive] = useState(0)
  const item = block.items[active]
  const evenlySpaced = block.items.length >= 2 && block.items.length <= 4
  return <section className="overflow-hidden rounded-2xl border border-border/80 bg-white shadow-sm">
    {block.title ? <h3 className="border-b px-4 py-3 font-semibold">{block.title}</h3> : null}
    <div className={cn('bg-muted/30 px-2 pt-2', evenlySpaced ? 'grid gap-1.5' : 'flex gap-1 overflow-x-auto')} style={evenlySpaced ? { gridTemplateColumns: `repeat(${block.items.length}, minmax(0, 1fr))` } : undefined}>{block.items.map((entry, index) => <button key={index} type="button" onClick={() => setActive(index)} className={cn('relative px-3 py-2.5 text-center text-sm font-semibold transition-all', active === index ? 'z-10 -mb-px rounded-t-xl border border-b-0 border-orange-300 bg-white text-orange-700 shadow-[0_-3px_10px_-8px_rgba(0,0,0,0.4)] after:absolute after:-bottom-1 after:inset-x-0 after:h-1 after:bg-white' : 'rounded-t-lg text-muted-foreground hover:bg-white/70 hover:text-foreground')}>{entry.label}</button>)}</div>
    {item ? <div className="min-h-20 border-t border-orange-300 bg-white px-5 py-4 text-center text-[15px] leading-relaxed"><div className="mx-auto max-w-2xl whitespace-pre-wrap">{renderInlineText(item.content, `table-preview-${active}`)}</div></div> : null}
  </section>
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
        <div key={`img-${i}`} className="mt-4 overflow-hidden rounded-2xl border border-border/80 bg-muted/40 p-1.5 shadow-sm ring-1 ring-black/5">
          <img src={block.src} alt={block.alt ?? ''} className="h-auto w-full rounded-xl object-cover" />
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
              <div className="aspect-video overflow-hidden rounded-2xl border border-border/80 bg-muted/40 p-1.5 shadow-sm ring-1 ring-black/5">
                <iframe
                  title={block.title ?? 'Video'}
                  src={pres.href}
                  className="h-full w-full rounded-xl border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            ) : (
              <video controls className="mt-1 w-full rounded-2xl border border-border/80 bg-black p-1.5 shadow-sm ring-1 ring-black/5" src={pres.href} />
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

    if (block.type === 'link') {
      elements.push(
        <LessonLinkCard
          key={`link-${i}`}
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
        <CalloutPreview key={`co-${i}`} variant={block.variant} title={block.title} content={block.content} defaultOpen={block.defaultOpen} />
      )
      i++
      continue
    }

    if (block.type === 'table') {
      elements.push(<TablePreview key={`table-${i}`} block={block} />)
      i++
      continue
    }

    if (block.type === 'guide') {
      elements.push(<GuidePreview key={`guide-${i}`} block={block} />)
      i++
      continue
    }

    if (block.type === 'playground') {
      elements.push(<PlaygroundPreview key={`playground-${i}`} block={block} />)
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
      elements.push(block.checkable ? (
        <ChecklistPreview key={`list-${i}`} block={block} />
      ) : (
        <ul key={`list-${i}`} className="ml-6 mt-4 flex list-disc flex-col gap-1.5">
          {block.items.map((item, idx) => (
            <li key={idx} className="text-[15px] leading-relaxed">
              {renderInlineText(item, `list-${i}-${idx}`)}
            </li>
          ))}
        </ul>
      ))
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

function ChecklistPreview({ block }: { block: Extract<LessonBlockLearner, { type: 'list' }> }) {
  const [checked, setChecked] = useState<Set<number>>(() => new Set())
  return <ul className="flex flex-col gap-2" aria-label="Checklist preview">
    {block.items.map((item, index) => {
      const isChecked = checked.has(index)
      return <li key={index}><label className="flex cursor-pointer items-start gap-3 py-1.5"><input type="checkbox" checked={isChecked} onChange={() => setChecked((current) => { const next = new Set(current); if (next.has(index)) next.delete(index); else next.add(index); return next })} className="mt-0.5 size-4 shrink-0 accent-orange-500" /><span className={cn('text-[15px] leading-relaxed', isChecked && 'line-through decoration-zinc-500')}>{renderInlineText(item, `checklist-preview-${index}`)}</span></label></li>
    })}
  </ul>
}

function GuidePreview({ block }: { block: Extract<LessonBlockLearner, { type: 'guide' }> }) {
  const [current, setCurrent] = useState(0)
  const isFirst = current === 0
  const isLast = current === block.steps.length - 1
  return <section className="rounded-2xl bg-zinc-50 px-5 py-5 sm:px-6">
    <p className="text-sm font-semibold text-zinc-500">{block.title || 'Guide'}</p>
    {block.description ? <div className="mt-5 whitespace-pre-wrap text-[15px] leading-7 text-zinc-900">{renderInlineText(block.description, 'guide-preview-description')}</div> : null}
    <ol className="mt-5">
      {block.steps.map((guideStep, index) => {
        const active = index === current
        const last = index === block.steps.length - 1
        return <li key={index} className="relative grid grid-cols-[2rem_1fr] gap-x-2.5 pb-5 last:pb-0">
          {!last ? <span className="absolute left-[0.9375rem] top-7 h-[calc(100%-1rem)] w-px bg-zinc-200" aria-hidden /> : null}
          <span className={cn('relative z-10 flex size-7 items-center justify-center rounded-full text-sm font-medium', active ? 'bg-orange-100 text-orange-600 ring-1 ring-orange-200' : 'bg-zinc-200 text-zinc-500')}>{index + 1}</span>
          <div className="min-w-0 pt-0.5">
            <p className={cn('text-[15px] font-semibold leading-6', active ? 'text-zinc-950' : 'text-zinc-500')}>{guideStep.title}</p>
            {active ? <div className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-zinc-800">{renderInlineText(guideStep.content, `guide-preview-${current}`)}</div> : null}
          </div>
        </li>
      })}
    </ol>
    <div className="mt-5 flex items-center">
      <button type="button" disabled={isFirst} onClick={() => setCurrent((value) => Math.max(0, value - 1))} className="rounded-lg border bg-white px-4 py-2 text-sm font-medium disabled:opacity-40">Back</button>
      <div className="flex-1" />
      <button type="button" disabled={isLast} onClick={() => setCurrent((value) => Math.min(block.steps.length - 1, value + 1))} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">Next</button>
    </div>
  </section>
}

function PlaygroundPreview({ block }: { block: Extract<LessonBlockLearner, { type: 'playground' }> }) {
  const [tab, setTab] = useState<'prompt' | 'chat'>('prompt')
  const [fullscreen, setFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(true)
  const [promptExpanded, setPromptExpanded] = useState(false)
  const [generating, setGenerating] = useState(false)
  const previewUrl = block.previewUrl || block.documentUrl
  const previewLabel = block.previewLabel || block.documentLabel || 'File preview'
  const hasFile = Boolean(previewUrl)
  async function copyPrompt() {
    try { await navigator.clipboard.writeText(block.prompt); setCopied(true); window.setTimeout(() => setCopied(false), 1800) } catch { /* clipboard can be unavailable */ }
  }
  async function runPlayground() {
    if (generating) return
    setTab('chat')
    setGenerating(true)
    await new Promise((resolve) => window.setTimeout(resolve, 1100))
    setGenerating(false)
  }
  return <section className={cn('relative overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm', fullscreen && 'fixed inset-4 z-[100] flex flex-col shadow-2xl')}>
    <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3.5"><span className="flex size-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><Sparkles className="size-[18px]" aria-hidden /></span><h3 className="min-w-0 flex-1 font-semibold text-zinc-950">{block.title || 'AI Playground'}</h3><button type="button" onClick={() => { setTab('prompt'); setGenerating(false) }} aria-label="Reset playground" className="flex size-9 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100"><RotateCcw className="size-4" /></button><button type="button" onClick={() => setFullscreen((value) => !value)} aria-label={fullscreen ? 'Exit fullscreen' : 'Open fullscreen'} className="flex size-9 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100">{fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}</button></div>
    <div className={cn('grid lg:h-[34rem]', hasFile && previewOpen && 'lg:grid-cols-2', fullscreen && 'min-h-0 flex-1 overflow-hidden lg:h-auto')}>
      <div className="flex min-h-0 flex-col border-b border-zinc-200 lg:border-r lg:border-b-0">
        <div className="flex border-b border-zinc-200 bg-zinc-50" role="tablist"><button type="button" role="tab" aria-selected={tab === 'prompt'} onClick={() => setTab('prompt')} className={cn('border-b-2 px-5 py-3 text-sm font-semibold', tab === 'prompt' ? 'border-orange-500 bg-white text-zinc-950' : 'border-transparent text-zinc-500')}>Prompt</button><button type="button" role="tab" aria-selected={tab === 'chat'} onClick={() => setTab('chat')} className={cn('border-b-2 px-5 py-3 text-sm font-semibold', tab === 'chat' ? 'border-orange-500 bg-white text-zinc-950' : 'border-transparent text-zinc-500')}>Chat</button></div>
        <div className={cn('min-h-80 flex-1 overflow-y-auto px-4 py-5', tab === 'chat' && 'bg-zinc-50')}>
          {tab === 'prompt' ? <pre className="mx-auto max-w-2xl whitespace-pre-wrap font-mono text-[14px] leading-7 text-zinc-900">{block.prompt}</pre> : <div className="mx-auto flex max-w-2xl flex-col gap-5">
            <div className="flex justify-end"><div className="flex max-w-[85%] flex-col items-end gap-2"><div className="w-full rounded-xl rounded-br-sm bg-zinc-100 p-3 shadow-sm"><div className="relative"><pre className={cn('whitespace-pre-wrap font-mono text-[14px] leading-7 text-zinc-900', !promptExpanded && 'line-clamp-6')}>{block.prompt}</pre>{!promptExpanded && block.prompt.length > 220 ? <span className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-b from-transparent to-zinc-100" /> : null}</div>{block.prompt.length > 220 ? <button type="button" onClick={() => setPromptExpanded((value) => !value)} className="mt-2 flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-800">{promptExpanded ? 'Show less' : 'Show more'}<ChevronDown className={cn('size-3.5 transition-transform', promptExpanded && 'rotate-180')} /></button> : null}</div>{block.documentUrl ? <a href={block.documentUrl} target="_blank" rel="noopener noreferrer" className="flex h-[58px] w-full min-w-64 items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-zinc-900 shadow-sm"><span className="flex size-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600"><FileText className="size-5" /></span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{block.documentLabel || 'Input document'}</span><span className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold">View</span></a> : null}</div></div>
            {generating ? <div className="flex items-center gap-3 py-2 text-sm text-zinc-500" role="status" aria-live="polite"><span className="flex items-center gap-1"><span className="size-2 animate-bounce rounded-full bg-orange-500 [animation-delay:-0.3s]" /><span className="size-2 animate-bounce rounded-full bg-orange-500 [animation-delay:-0.15s]" /><span className="size-2 animate-bounce rounded-full bg-orange-500" /></span><span>Claude is working…</span></div> : <div className="flex flex-col gap-3"><div className="whitespace-pre-wrap text-[15px] leading-7 text-zinc-900">{renderInlineText(block.answer, 'playground-preview-chat')}</div>{block.previewUrl ? <a href={block.previewUrl} target="_blank" rel="noopener noreferrer" className="flex h-[66px] items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-zinc-900 shadow-sm"><span className="flex size-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600"><FileText className="size-5" /></span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{block.previewLabel || 'Generated output'}</span><span className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold">View</span></a> : null}</div>}
          </div>}
        </div>
        {tab === 'prompt' && block.documentUrl ? <a href={block.documentUrl} target="_blank" rel="noopener noreferrer" className="mx-4 mb-4 flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-medium text-zinc-800 hover:border-orange-300"><Paperclip className="size-4 text-orange-600" aria-hidden /><span className="min-w-0 flex-1 truncate">{block.documentLabel || 'Input document'}</span><span className="text-xs font-semibold text-orange-600">View</span><ExternalLink className="size-4 text-zinc-400" aria-hidden /></a> : null}
        <div className="flex justify-end gap-2 border-t border-zinc-200 px-4 py-3"><button type="button" onClick={() => void copyPrompt()} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100">{copied ? <Check className="size-4 text-orange-600" /> : <Copy className="size-4" />}{copied ? 'Copied' : 'Copy'}</button><button type="button" disabled={generating} onClick={() => void runPlayground()} className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-70"><Sparkles className={cn('size-4', generating && 'animate-pulse')} />{generating ? 'Working…' : tab === 'chat' ? 'Regenerate' : 'Try it'}</button></div>
      </div>
      {hasFile && previewOpen ? <div className="flex min-h-0 flex-col bg-zinc-50/50">
        <div className="flex h-11 shrink-0 items-center border-b border-zinc-200 px-4"><p className="flex-1 text-sm font-semibold">Preview</p>{previewUrl ? <a href={previewUrl} target="_blank" rel="noopener noreferrer" aria-label="Open preview in new tab" className="mr-2 text-zinc-500 hover:text-orange-600"><ExternalLink className="size-4" /></a> : null}<button type="button" onClick={() => setPreviewOpen(false)} aria-label="Collapse preview" className="flex size-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 hover:text-orange-600"><PanelRightClose className="size-4" /></button></div>
        <div className="min-h-80 flex-1 overflow-hidden">{previewUrl ? (/(?:\.png|\.jpe?g|\.webp|\.gif)(?:\?|$)/i.test(previewUrl) ? <div className="flex size-full items-center justify-center p-4"><img src={previewUrl} alt={previewLabel} className="max-h-full max-w-full object-contain" /></div> : <iframe title={previewLabel} src={previewUrl} className="size-full min-h-80 border-0 bg-white" sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads" />) : <div className="flex size-full min-h-80 flex-col items-center justify-center px-6 text-center text-zinc-500"><Paperclip className="mb-3 size-7 text-orange-300" /><p className="max-w-xs text-sm">A file preview appears here when the exercise uses an input or generated file.</p></div>}</div>
      </div> : hasFile ? <button type="button" onClick={() => setPreviewOpen(true)} aria-label="Open preview" className="absolute right-5 mt-3 flex size-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm hover:text-orange-600"><PanelRightOpen className="size-4" /></button> : null}
    </div>
  </section>
}
