import { Download, FileText } from 'lucide-react'
import { fileTypeBadge } from '@appex/lesson-schema'
import { cn } from '@shared/lib'

interface LessonFileDownloadCardProps {
  url: string
  label: string
  description?: string
  className?: string
}

/**
 * Learner-facing download card for lesson file blocks (light surface, type badge, download CTA).
 */
export function LessonFileDownloadCard({
  url,
  label,
  description,
  className,
}: LessonFileDownloadCardProps) {
  const downloadName = label.trim() || 'download'
  const badge = fileTypeBadge(label, url)

  return (
    <div className={cn('mt-5 space-y-2 first:mt-0', className)}>
      {description ? (
        <p className="text-[15px] leading-relaxed text-foreground">{description}</p>
      ) : null}
      <a
        href={url}
        download={downloadName}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-4 rounded-2xl bg-muted px-4 py-3.5 text-left no-underline shadow-sm ring-1 ring-border transition-colors hover:bg-muted/70 sm:px-5 sm:py-4"
      >
        <div className="relative shrink-0" aria-hidden>
          <div className="flex size-14 items-center justify-center rounded-xl bg-card shadow-sm ring-1 ring-border">
            <FileText className="size-8 text-muted-foreground/50" strokeWidth={1.25} />
          </div>
          <span className="absolute -bottom-1 left-1 rounded-md bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold leading-none tracking-wide text-white shadow-sm">
            {badge}
          </span>
        </div>

        <span className="min-w-0 flex-1">
          <span className="block line-clamp-2 text-base font-semibold leading-snug text-foreground">
            {label}
          </span>
          <span className="mt-0.5 block text-sm text-muted-foreground">Download</span>
        </span>

        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-background text-foreground transition-colors group-hover:bg-muted">
          <Download className="size-5" strokeWidth={2.25} aria-hidden />
          <span className="sr-only">Download {label}</span>
        </span>
      </a>
    </div>
  )
}
