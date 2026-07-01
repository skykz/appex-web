import { ExternalLink, FileText } from 'lucide-react'
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
  return (
    <div className={cn('mt-5 space-y-2 first:mt-0', className)}>
      {description ? (
        <p className="text-[15px] leading-relaxed text-foreground">{description}</p>
      ) : null}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-start gap-3 rounded-2xl border border-blue-500/70 bg-zinc-950 px-4 py-3 text-left text-zinc-50 no-underline shadow-sm transition-colors hover:border-blue-400 hover:bg-zinc-900"
      >
        <FileText className="mt-0.5 size-5 shrink-0 text-blue-300" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold leading-snug">{label}</span>
          <span className="mt-2 flex min-w-0 items-center gap-2 text-xs font-semibold text-blue-300">
            <ExternalLink className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate underline decoration-blue-300/60 underline-offset-4 group-hover:decoration-blue-200">
              {url}
            </span>
          </span>
        </span>
      </a>
    </div>
  )
}
