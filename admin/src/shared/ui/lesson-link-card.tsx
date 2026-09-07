import { ExternalLink, Link2 } from 'lucide-react'
import { cn } from '@shared/lib'

interface LessonLinkCardProps {
  url: string
  label: string
  description?: string
  className?: string
}

/**
 * Admin preview link card matching the learner link block (external URL, new tab).
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
        className="group flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-left text-zinc-950 no-underline shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 ring-1 ring-orange-100"><Link2 className="size-[18px]" aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold leading-snug">{label}</span>
          {description ? <span className="mt-1 block line-clamp-2 text-sm leading-relaxed text-zinc-500">{description}</span> : null}
          <span className="mt-1.5 block truncate text-xs font-medium text-orange-600/80">{source}</span>
        </span>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors group-hover:bg-orange-50 group-hover:text-orange-600"><ExternalLink className="size-4" aria-hidden /></span>
      </a>
    </div>
  )
}
