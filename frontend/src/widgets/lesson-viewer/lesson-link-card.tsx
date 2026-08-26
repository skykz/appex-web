import { ExternalLink, Link2 } from 'lucide-react'
import { cn } from '@shared/lib'

interface LessonLinkCardProps {
  url: string
  label: string
  description?: string
  className?: string
}

/**
 * Learner-facing external link card for lesson link blocks (opens URL in a new tab).
 */
export function LessonLinkCard({ url, label, description, className }: LessonLinkCardProps) {
  const source = (() => {
    try { return new URL(url, window.location.origin).hostname.replace(/^www\./, '') || 'Open link' } catch { return 'Open link' }
  })()
  return (
    <div className={cn('mt-5 first:mt-0', className)}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3 rounded-2xl border border-border/80 bg-card px-4 py-3.5 text-left text-foreground no-underline shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/[0.09] text-primary ring-1 ring-primary/15"><Link2 className="size-[18px]" aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold leading-snug">{label}</span>
          {description ? <span className="mt-1 block line-clamp-2 text-sm leading-relaxed text-muted-foreground">{description}</span> : null}
          <span className="mt-1.5 block truncate text-xs font-medium text-primary/80">{source}</span>
        </span>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors group-hover:bg-primary/[0.08] group-hover:text-primary"><ExternalLink className="size-4" aria-hidden /></span>
      </a>
    </div>
  )
}
