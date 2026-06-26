import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchLessonSubmissions,
  fetchSubmissionsUnreadCount,
  markAllSubmissionsRead,
  patchLessonSubmission,
  patchSubmissionRead,
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

const SUBMISSIONS_QUERY_KEY = ['admin', 'lesson-submissions'] as const
const UNREAD_COUNT_KEY = ['admin', 'lesson-submissions', 'unread-count'] as const

type SubmissionQueueFilter = 'all' | 'submitted' | 'reviewed'

/** Invalidates submission list and sidebar unread badge after read-state changes. */
function invalidateSubmissions(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: SUBMISSIONS_QUERY_KEY })
  qc.invalidateQueries({ queryKey: UNREAD_COUNT_KEY })
}

/**
 * Lists learner homework submissions with staff feedback and reviewed state.
 */
export function SubmissionsPage() {
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [lessonFilter, setLessonFilter] = useState(
    () => searchParams.get('lessonId')?.trim() ?? ''
  )
  const [queueFilter, setQueueFilter] = useState<SubmissionQueueFilter>(() => {
    const status = searchParams.get('status')?.trim()
    return status === 'submitted' || status === 'reviewed' ? status : 'all'
  })

  const parsedLesson = lessonFilter.trim() ? Number(lessonFilter.trim()) : NaN
  const lessonIdFilter = Number.isFinite(parsedLesson) ? parsedLesson : undefined
  const statusParam =
    queueFilter === 'all' ? undefined : (queueFilter as 'submitted' | 'reviewed')

  const { data: unreadCount = 0 } = useQuery({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: fetchSubmissionsUnreadCount,
  })

  const { data, isLoading } = useQuery({
    queryKey: [...SUBMISSIONS_QUERY_KEY, page, lessonIdFilter, statusParam, unreadOnly],
    queryFn: () =>
      fetchLessonSubmissions({
        page,
        limit: PAGE,
        lessonId: lessonIdFilter,
        status: statusParam,
        unreadOnly: unreadOnly || undefined,
      }),
    enabled: !lessonFilter.trim() || Number.isFinite(parsedLesson),
  })

  const markRead = useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) => patchSubmissionRead(id, read),
    onSuccess: () => invalidateSubmissions(qc),
    onError: (e: unknown) => {
      toast.error(e instanceof ApiError ? e.message : 'Failed')
    },
  })

  const readAll = useMutation({
    mutationFn: markAllSubmissionsRead,
    onSuccess: (res) => {
      invalidateSubmissions(qc)
      toast.success(res.updated > 0 ? `Marked ${res.updated} as read` : 'Queue is up to date')
    },
    onError: (e: unknown) => {
      toast.error(e instanceof ApiError ? e.message : 'Failed')
    },
  })

  const patch = useMutation({
    mutationFn: ({
      id,
      adminFeedback,
      grade,
      status,
    }: {
      id: string
      adminFeedback?: string
      grade?: string | null
      status?: 'reviewed'
    }) => patchLessonSubmission(id, { adminFeedback, grade, status }),
    onSuccess: () => {
      invalidateSubmissions(qc)
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
          <label className="flex cursor-pointer items-center gap-2 text-sm sm:mb-2">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => {
                setUnreadOnly(e.target.checked)
                setPage(1)
              }}
            />
            Unread only
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="sm:mb-2 sm:ml-auto"
            disabled={unreadCount <= 0 || readAll.isPending}
            onClick={() => readAll.mutate()}
          >
            Read all
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No submissions yet.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((s) => (
            <SubmissionCard
              key={s.id}
              s={s}
              onOpen={() => {
                if (!s.read_at) markRead.mutate({ id: s.id, read: true })
              }}
              onMarkRead={() => markRead.mutate({ id: s.id, read: !s.read_at })}
              onSave={(feedback, grade) =>
                patch.mutate({ id: s.id, adminFeedback: feedback, grade, status: 'reviewed' })
              }
            />
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
 * Editable card for one submission: collapsible body, read tracking, and feedback fields.
 */
function SubmissionCard({
  s,
  onOpen,
  onMarkRead,
  onSave,
}: {
  s: LessonSubmissionRow
  onOpen: () => void
  onMarkRead: () => void
  onSave: (feedback: string, grade: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [feedback, setFeedback] = useState(s.admin_feedback ?? '')
  const [grade, setGrade] = useState(s.grade ?? '')

  /** Expands the submission and marks it read on first open. */
  function toggleOpen() {
    const next = !open
    setOpen(next)
    if (next) onOpen()
  }

  return (
    <li className="rounded-xl border border-border/70 bg-card shadow-sm">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
        onClick={toggleOpen}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {!s.read_at ? (
              <span className="rounded-full bg-red-600/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-600">
                New
              </span>
            ) : null}
            <span
              className={
                s.status === 'reviewed'
                  ? 'rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700'
                  : 'rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800'
              }
            >
              {s.status}
            </span>
          </div>
          <p className="mt-1 font-medium">
            {s.lesson_title}{' '}
            <span className="font-normal text-muted-foreground">({s.lesson_label})</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {s.user_name} · {s.user_email} · lesson #{s.lesson_id}
          </p>
          <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</p>
        </div>
        <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
      {open ? (
        <div className="border-t border-border/60 px-4 py-3">
          {s.message ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{s.message}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No message text.</p>
          )}
          {s.attachment_url ? (
            <a
              href={s.attachment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-primary underline"
            >
              Submitted file
            </a>
          ) : null}
          <Input
            className="mt-3 max-w-xs border-border/80"
            placeholder="Grade, e.g. A, 95/100, Passed"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
          />
          <Textarea
            className="mt-3 min-h-[72px] border-border/80"
            placeholder="Staff feedback to learner…"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => onSave(feedback, grade)}>
              Save grade, feedback & mark reviewed
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onMarkRead}>
              {s.read_at ? 'Mark unread' : 'Mark read'}
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  )
}
