import { ExternalLink, FileText } from 'lucide-react'
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
  return (
    <div className={cn('mt-5 space-y-2 first:mt-0', className)}>
      {description ? (
        <p className="text-[15px] leading-relaxed text-foreground">{description}</p>
      ) : null}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-start gap-3 rounded-2xl border border-blue-500/30 bg-card px-4 py-3 text-left text-foreground no-underline shadow-sm transition-colors hover:border-blue-500/60 hover:bg-muted"
      >
        <FileText className="mt-0.5 size-5 shrink-0 text-blue-500" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold leading-snug">{label}</span>
          <span className="mt-2 flex min-w-0 items-center gap-2 text-xs font-semibold text-blue-600">
            <ExternalLink className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate underline decoration-blue-500/50 underline-offset-4 group-hover:decoration-blue-600">
              {url}
            </span>
          </span>
        </span>
      </a>
    </div>
  )
}
