import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock3, ExternalLink, FileText, Inbox } from 'lucide-react'
import { Button, SectionLoader } from '@shared/ui'
import { cn } from '@shared/lib'
import { lessonApi } from '@widgets/lesson-viewer/api'

type MySubmission = Awaited<ReturnType<typeof lessonApi.listMySubmissions>>['items'][number]

/**
 * Returns display metadata for the learner-visible review status.
 */
function statusMeta(status: string): { label: string; className: string; icon: typeof Clock3 } {
  if (status === 'reviewed') {
    return {
      label: 'Reviewed',
      className: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20',
      icon: CheckCircle2,
    }
  }

  return {
    label: 'Awaiting review',
    className: 'bg-amber-500/10 text-amber-800 ring-amber-500/20',
    icon: Clock3,
  }
}

/**
 * Learner submissions dashboard: history, staff grade, feedback, and uploaded files.
 */
export default function MySubmissionsPage() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['lesson-submissions', 'me'],
    queryFn: () => lessonApi.listMySubmissions(),
  })

  const submissions = useMemo(() => data?.items ?? [], [data?.items])
  const reviewedCount = useMemo(
    () => submissions.filter((item) => item.status === 'reviewed').length,
    [submissions]
  )

  return (
    <div className="relative isolate min-h-dvh w-full">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-primary/[0.07] via-transparent to-transparent" />
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Learning work
            </span>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">My submissions</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Check work you sent from lessons, review status, teacher feedback, grades,
              and uploaded files.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:min-w-56">
            <div className="rounded-xl border border-border/70 bg-card px-3 py-2 shadow-sm">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-2xl font-bold tabular-nums">{submissions.length}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card px-3 py-2 shadow-sm">
              <p className="text-xs text-muted-foreground">Reviewed</p>
              <p className="text-2xl font-bold tabular-nums">{reviewedCount}</p>
            </div>
          </div>
        </header>

        {isPending ? (
          <SectionLoader label="Loading submissions…" />
        ) : isError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
            Failed to load submissions: {(error as Error)?.message}
          </div>
        ) : submissions.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border/80 bg-card/70 px-6 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Inbox className="size-6" aria-hidden />
            </div>
            <h2 className="mt-4 text-lg font-semibold">No submissions yet</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              When you submit work inside a lesson, it will appear here after upload.
            </p>
            <Button asChild className="mt-5">
              <Link to="/skills">Open courses</Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-4">
            {submissions.map((submission) => (
              <SubmissionCard key={submission.id} submission={submission} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/**
 * One submitted work card with review status, optional grade, staff feedback, and attachment link.
 */
function SubmissionCard({ submission }: { submission: MySubmission }) {
  const meta = statusMeta(submission.status)
  const StatusIcon = meta.icon

  return (
    <li>
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-border/60 bg-muted/20 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                {submission.course_title || 'Course'} · {submission.module_title || 'Module'}
              </p>
              <h2 className="mt-1 text-base font-semibold leading-snug">
                {submission.lesson_title || `Lesson #${submission.lesson_id}`}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {submission.lesson_label} · Submitted{' '}
                {new Date(submission.created_at).toLocaleString()}
              </p>
            </div>
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1',
                meta.className
              )}
            >
              <StatusIcon className="size-3.5" aria-hidden />
              {meta.label}
            </span>
          </div>

          <div className="space-y-4 px-4 py-4 sm:px-5">
            {submission.grade ? (
              <div className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Grade</span>
                <span className="font-bold text-primary">{submission.grade}</span>
              </div>
            ) : null}

            {submission.message ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Your answer
                </p>
                <p className="mt-1 whitespace-pre-wrap rounded-xl bg-muted/30 px-3 py-2 text-sm leading-relaxed">
                  {submission.message}
                </p>
              </div>
            ) : null}

            {submission.attachment_url ? (
              <a
                href={submission.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                <FileText className="size-4" aria-hidden />
                Open submitted file
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            ) : null}

            {submission.admin_feedback ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Feedback
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-emerald-950">
                  {submission.admin_feedback}
                </p>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border/80 px-3 py-2 text-sm text-muted-foreground">
                Feedback and grade will appear here after review.
              </p>
            )}
          </div>
      </div>
    </li>
  )
}
