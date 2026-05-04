import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  fetchLessonSubmissions,
  patchLessonSubmission,
  type LessonSubmissionRow,
} from '@features/submissions-admin/api'
import { Button } from '@shared/ui/button'
import { Input } from '@shared/ui/input'
import { Textarea } from '@shared/ui/textarea'
import { Card, CardContent } from '@shared/ui/card'
import { PageHeader } from '@shared/ui/page-header'
import { Skeleton } from '@shared/ui/skeleton'
import { Select } from '@shared/ui/select'
import { ApiError } from '@shared/api/http-client'

const PAGE = 15

type SubmissionQueueFilter = 'all' | 'submitted' | 'reviewed'

/**
 * Lists learner homework submissions with staff feedback and reviewed state.
 */
export function SubmissionsPage() {
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [lessonFilter, setLessonFilter] = useState('')
  const [queueFilter, setQueueFilter] = useState<SubmissionQueueFilter>('all')

  useEffect(() => {
    const lid = searchParams.get('lessonId')?.trim()
    if (lid) setLessonFilter(lid)
    const st = searchParams.get('status')?.trim()
    if (st === 'submitted' || st === 'reviewed') {
      setQueueFilter(st)
    }
  }, [searchParams])

  const parsedLesson = lessonFilter.trim() ? Number(lessonFilter.trim()) : NaN
  const lessonIdFilter = Number.isFinite(parsedLesson) ? parsedLesson : undefined
  const statusParam =
    queueFilter === 'all' ? undefined : (queueFilter as 'submitted' | 'reviewed')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'lesson-submissions', page, lessonIdFilter, statusParam],
    queryFn: () =>
      fetchLessonSubmissions({
        page,
        limit: PAGE,
        lessonId: lessonIdFilter,
        status: statusParam,
      }),
    enabled: !lessonFilter.trim() || Number.isFinite(parsedLesson),
  })

  const patch = useMutation({
    mutationFn: ({
      id,
      adminFeedback,
      status,
    }: {
      id: string
      adminFeedback?: string
      status?: 'reviewed'
    }) => patchLessonSubmission(id, { adminFeedback, status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'lesson-submissions'] })
      toast.success('Saved')
    },
    onError: (e: unknown) => {
      toast.error(e instanceof ApiError ? e.message : 'Failed')
    },
  })

  const rows = data?.items ?? []
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE))

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Learning"
        title="Student submissions"
        description="Work sent from lesson “Student submission” blocks. Use Awaiting review for the staff queue."
      />

      <Card className="border-border/70 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[200px] flex-1">
            <label className="text-xs font-medium text-muted-foreground">
              Filter by lesson id (optional)
            </label>
            <Input
              className="mt-1 max-w-xs font-mono text-sm"
              placeholder="e.g. 42"
              value={lessonFilter}
              onChange={(e) => {
                setLessonFilter(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <div className="w-full sm:w-56">
            <label className="text-xs font-medium text-muted-foreground">Queue</label>
            <Select
              className="mt-1 h-10 w-full border-border/80 shadow-sm"
              value={queueFilter}
              onChange={(e) => {
                setQueueFilter(e.target.value as SubmissionQueueFilter)
                setPage(1)
              }}
            >
              <option value="all">All statuses</option>
              <option value="submitted">Awaiting review</option>
              <option value="reviewed">Reviewed</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No submissions yet.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((s) => (
            <SubmissionCard key={s.id} s={s} onSave={(fb) => patch.mutate({ id: s.id, adminFeedback: fb, status: 'reviewed' })} />
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {page} / {totalPages}
        </span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Editable card for one submission: learner text, links, and feedback field.
 */
function SubmissionCard({
  s,
  onSave,
}: {
  s: LessonSubmissionRow
  onSave: (feedback: string) => void
}) {
  const [feedback, setFeedback] = useState(s.admin_feedback ?? '')
  return (
    <li className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">
            {s.lesson_title} <span className="text-muted-foreground">({s.lesson_label})</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {s.user_name} · {s.user_email} · lesson #{s.lesson_id}
          </p>
          <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</p>
        </div>
        <span
          className={
            s.status === 'reviewed'
              ? 'rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700'
              : 'rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800'
          }
        >
          {s.status}
        </span>
      </div>
      {s.message ? (
        <p className="mt-3 whitespace-pre-wrap text-sm">{s.message}</p>
      ) : null}
      {s.attachment_url ? (
        <a
          href={s.attachment_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm text-primary underline"
        >
          Attachment
        </a>
      ) : null}
      <Textarea
        className="mt-3 min-h-[72px] border-border/80"
        placeholder="Staff feedback to learner…"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
      />
      <Button type="button" size="sm" className="mt-2" onClick={() => onSave(feedback)}>
        Save feedback & mark reviewed
      </Button>
    </li>
  )
}
