import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BarChart3, ExternalLink } from 'lucide-react'
import { coursesApi, type Lesson, type LessonEngagementResponse } from './api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@shared/ui/dialog'
import { Button } from '@shared/ui/button'
import { Skeleton } from '@shared/ui/skeleton'
import { DataTable, type Column } from '@shared/ui/data-table'

interface Props {
  lesson: Lesson
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Per-lesson engagement: quiz stats by step/block, open answers, and homework submissions.
 */
export function LessonEngagementDialog({ lesson, open, onOpenChange }: Props) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'lesson-engagement', lesson.id],
    queryFn: () => coursesApi.lessonEngagement(lesson.id),
    enabled: open,
  })

  /**
   * Rolls up quiz attempts per step so admins see where learners drop off before editing JSON.
   */
  const quizFunnelByStep = useMemo(() => {
    if (!data?.quizByBlock?.length) return []
    const map = new Map<number, { attempts: number; blocks: number; wrong: number }>()
    for (const row of data.quizByBlock) {
      const cur = map.get(row.stepIndex) ?? { attempts: 0, blocks: 0, wrong: 0 }
      cur.attempts += row.attempts
      cur.blocks += 1
      cur.wrong += row.wrong
      map.set(row.stepIndex, cur)
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([stepIndex, v]) => ({
        stepIndex,
        attempts: v.attempts,
        blocks: v.blocks,
        wrongRate: v.attempts > 0 ? v.wrong / v.attempts : 0,
      }))
  }, [data?.quizByBlock])

  const maxStepAttempts = useMemo(
    () => quizFunnelByStep.reduce((m, r) => Math.max(m, r.attempts), 0) || 1,
    [quizFunnelByStep]
  )

  const quizColumns: Column<LessonEngagementResponse['quizByBlock'][number]>[] = [
    {
      key: 'loc',
      header: 'Step · block',
      render: (r) => (
        <span className="font-mono text-xs tabular-nums">
          {r.stepIndex + 1} · {r.blockIndex + 1}
        </span>
      ),
    },
    {
      key: 'attempts',
      header: 'Attempts',
      render: (r) => <span className="tabular-nums">{r.attempts}</span>,
    },
    {
      key: 'wrong',
      header: 'Wrong',
      render: (r) => <span className="tabular-nums text-amber-700">{r.wrong}</span>,
    },
    {
      key: 'rate',
      header: 'Wrong rate',
      render: (r) => (
        <span className="tabular-nums font-medium">
          {(r.wrongRate * 100).toFixed(0)}%
        </span>
      ),
    },
  ]

  const openColumns: Column<LessonEngagementResponse['openResponses'][number]>[] = [
    {
      key: 'loc',
      header: 'Step · block',
      render: (r) => (
        <span className="font-mono text-xs tabular-nums">
          {r.stepIndex + 1} · {r.blockIndex + 1}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'Learner',
      render: (r) => (
        <div>
          <div className="text-sm">{r.userName || '—'}</div>
          <div className="text-xs text-muted-foreground">{r.userEmail}</div>
        </div>
      ),
    },
    {
      key: 'text',
      header: 'Response',
      render: (r) => (
        <p className="max-w-md whitespace-pre-wrap text-sm leading-relaxed">{r.text}</p>
      ),
    },
    {
      key: 'at',
      header: 'When',
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {new Date(r.createdAt).toLocaleString()}
        </span>
      ),
    },
  ]

  const subColumns: Column<
    LessonEngagementResponse['submissions']['recent'][number]
  >[] = [
    {
      key: 'user',
      header: 'Learner',
      render: (r) => (
        <div>
          <div className="text-sm">{r.userName || '—'}</div>
          <div className="text-xs text-muted-foreground">{r.userEmail}</div>
        </div>
      ),
    },
    {
      key: 'msg',
      header: 'Message',
      render: (r) => (
        <p className="max-w-xs truncate text-sm">{r.message ?? '—'}</p>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <span className="text-xs uppercase">{r.status}</span>,
    },
    {
      key: 'at',
      header: 'When',
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {new Date(r.createdAt).toLocaleString()}
        </span>
      ),
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden border-border/80 p-0 sm:max-w-4xl">
        <DialogHeader className="shrink-0 border-b border-border/60 bg-muted/30 px-6 py-5 text-left">
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" aria-hidden />
            Lesson insights
          </DialogTitle>
          <DialogDescription>
            {lesson.label} — {lesson.title}
            <span className="mt-1 block font-mono text-xs text-muted-foreground">
              Lesson id {lesson.id}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">
              {(error as Error)?.message ?? 'Failed to load engagement data.'}
            </p>
          ) : data ? (
            <>
              <section className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Summary
                </p>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 tabular-nums">
                    <strong>{data.summary.totalQuizAttempts}</strong> quiz checks
                  </span>
                  <span className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 tabular-nums">
                    <strong>{data.summary.uniqueQuizBlocks}</strong> quiz blocks with data
                  </span>
                  <span className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 tabular-nums">
                    <strong>{data.submissions.total}</strong> homework submissions
                  </span>
                </div>
                {data.summary.statsApproximate ? (
                  <p className="text-xs text-amber-800">
                    Block stats use the latest {data.summary.statsSampleSize.toLocaleString()}{' '}
                    attempts (high volume lesson). Wrong-rate is approximate.
                  </p>
                ) : null}
              </section>

              <section className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Quiz funnel by step
                </p>
                {quizFunnelByStep.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No per-step quiz volume yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {quizFunnelByStep.map((row) => (
                      <li
                        key={row.stepIndex}
                        className="flex flex-col gap-1 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 sm:flex-row sm:items-center sm:gap-4"
                      >
                        <div className="w-28 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                          Step {row.stepIndex + 1}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary/80"
                              style={{
                                width: `${Math.min(100, (row.attempts / maxStepAttempts) * 100)}%`,
                              }}
                            />
                          </div>
                          <div className="flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                            <span className="tabular-nums">{row.attempts} attempts</span>
                            <span className="tabular-nums">{row.blocks} blocks with data</span>
                            <span className="tabular-nums">Wrong rate {(row.wrongRate * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Quiz blocks — wrong-answer rate
                  </p>
                  <span className="text-[11px] text-muted-foreground">
                    Step/block index matches the editor (1-based display)
                  </span>
                </div>
                {data.quizByBlock.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No quiz attempts yet.</p>
                ) : (
                  <DataTable
                    rows={data.quizByBlock}
                    columns={quizColumns}
                    getRowKey={(r) => `${r.stepIndex}-${r.blockIndex}`}
                  />
                )}
              </section>

              <section className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Open-ended quiz responses (review queue)
                </p>
                {data.openResponses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No open-text responses recorded (or migration 005 not applied).
                  </p>
                ) : (
                  <DataTable
                    rows={data.openResponses}
                    columns={openColumns}
                    getRowKey={(r) =>
                      `${r.stepIndex}-${r.blockIndex}-${r.createdAt}-${r.userEmail}`
                    }
                  />
                )}
              </section>

              <section className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Student submission block — recent
                  </p>
                  <Button variant="outline" size="sm" className="gap-1.5" asChild>
                    <Link to={`/submissions?lessonId=${lesson.id}&status=submitted`}>
                      Open homework queue for this lesson
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
                {data.submissions.recent.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No submissions yet.</p>
                ) : (
                  <DataTable
                    rows={data.submissions.recent}
                    columns={subColumns}
                    getRowKey={(r) => r.id}
                  />
                )}
              </section>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
