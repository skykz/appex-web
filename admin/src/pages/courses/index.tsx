import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Search,
  ArrowUpDown,
  FolderOpen,
  Info,
  EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { coursesApi, type Course } from '@features/courses/api'
import { CourseForm } from '@features/courses/course-form'
import { categoriesApi } from '@features/categories/api'
import { Button } from '@shared/ui/button'
import { Input } from '@shared/ui/input'
import { Select } from '@shared/ui/select'
import { Card, CardContent } from '@shared/ui/card'
import { PageHeader } from '@shared/ui/page-header'
import { Skeleton } from '@shared/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@shared/ui/dialog'
import { DataTable, type Column } from '@shared/ui/data-table'
import { EmojiOrImageBadge } from '@shared/ui/emoji-or-image-badge'
import { DestructiveConfirmDialog } from '@shared/ui/destructive-confirm-dialog'
import { ApiError } from '@shared/api/http-client'
import { swapAdjacentIds } from '@shared/lib/reorder-payloads'

type SortKey = 'order' | 'title' | 'created'

/**
 * Lists all courses with filters and opens create/edit dialogs; deleting is confirmed inline.
 */
export function CoursesPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { data: courses, isLoading } = useQuery({
    queryKey: ['admin', 'courses'],
    queryFn: coursesApi.list,
  })
  const { data: categories } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: categoriesApi.list,
  })

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Course | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [conflictBanner, setConflictBanner] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('order')

  const categoryLabelBySlug = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of categories ?? []) m.set(c.slug, c.label)
    return m
  }, [categories])

  const remove = useMutation({
    mutationFn: (args: { id: number; force?: boolean }) => coursesApi.remove(args.id, args),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'courses'] })
      setConflictBanner(null)
      setDeleteError(null)
      setDeleteTarget(null)
      toast.success('Course deleted')
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : 'Could not delete course.'
      setDeleteError(msg)
      if (err instanceof ApiError && err.status === 409) {
        setConflictBanner(msg)
        return
      }
      toast.error(msg)
    },
  })

  const reorderCoursesMutation = useMutation({
    mutationFn: (orderedIds: number[]) => coursesApi.reorderCourses(orderedIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'courses'] })
      toast.success('Course order saved')
    },
    onError: (err: unknown) =>
      toast.error(err instanceof ApiError ? err.message : 'Could not reorder courses'),
  })

  const filtered = useMemo(() => {
    return (courses ?? [])
      .filter((c) => filter === 'all' || c.category === filter)
      .filter((c) =>
        search.trim() ? c.title.toLowerCase().includes(search.toLowerCase()) : true
      )
  }, [courses, filter, search])

  const sorted = useMemo(() => {
    const list = [...filtered]
    if (sortBy === 'order') {
      list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title))
    } else if (sortBy === 'title') {
      list.sort((a, b) => a.title.localeCompare(b.title))
    } else {
      list.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }
    return list
  }, [filtered, sortBy])

  /** Full list ordered by `order` for global reorder (API requires every course id). */
  const canonicalCourseOrder = useMemo(
    () =>
      [...(courses ?? [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title)
      ),
    [courses]
  )

  const canReorderGlobally =
    sortBy === 'order' && filter === 'all' && !search.trim() && (courses?.length ?? 0) > 0

  /**
   * Swaps a course in the global list and saves the new permutation to the server.
   */
  function moveCourseRow(courseId: number, direction: -1 | 1) {
    const idx = canonicalCourseOrder.findIndex((c) => c.id === courseId)
    const ids = canonicalCourseOrder.map((c) => c.id)
    const next = swapAdjacentIds(ids, idx, direction)
    if (next) reorderCoursesMutation.mutate(next)
  }

  /** Resets list filters so catalog reorder uses the same full permutation the API expects. */
  function resetFiltersForCatalogReorder() {
    setFilter('all')
    setSearch('')
    setSortBy('order')
  }

  const columns: Column<Course>[] = [
    {
      key: 'title',
      header: 'Course',
      render: (c) => (
        <div className="flex items-center gap-3">
          <EmojiOrImageBadge value={c.emoji} frameClassName="h-11 w-11 text-xl shadow-inner" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 font-medium leading-snug">
              <span>{c.title}</span>
              {!c.is_visible ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/70 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                  <EyeOff className="h-3 w-3" />
                  Hidden
                </span>
              ) : null}
            </div>
            <div className="line-clamp-1 text-xs text-muted-foreground">{c.description}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (c) => (
        <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-2.5 py-0.5 text-xs font-medium text-foreground/90">
          {categoryLabelBySlug.get(c.category) ?? c.category}
        </span>
      ),
    },
    {
      key: 'structure',
      header: 'Content',
      render: (c) => (
        <span className="text-muted-foreground">
          {c.module_count ?? 0} modules · {c.lesson_count ?? 0} lessons
        </span>
      ),
    },
    { key: 'duration', header: 'Duration', render: (c) => <span className="tabular-nums">{c.duration}</span> },
    {
      key: 'actions',
      header: '',
      className: 'w-56 text-right',
      render: (c) => {
        const globalIdx = canonicalCourseOrder.findIndex((x) => x.id === c.id)
        const reorderDisabled =
          !canReorderGlobally ||
          reorderCoursesMutation.isPending ||
          globalIdx < 0
        return (
          <div className="flex justify-end gap-1">
            <div className="mr-1 flex items-center rounded-md border border-border/60 bg-background/80 p-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={reorderDisabled || globalIdx <= 0}
                title={
                  canReorderGlobally
                    ? 'Move up in catalog'
                    : 'Sort by “manual order”, clear search, and show all categories to reorder'
                }
                onClick={() => moveCourseRow(c.id, -1)}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={reorderDisabled || globalIdx >= canonicalCourseOrder.length - 1}
                title={
                  canReorderGlobally
                    ? 'Move down in catalog'
                    : 'Sort by “manual order”, clear search, and show all categories to reorder'
                }
                onClick={() => moveCourseRow(c.id, 1)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" className="h-8 border-border/80 bg-background shadow-none" asChild>
              <Link to={`/courses/${c.id}`}>
                Open
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(c)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteTarget(c)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )
      },
    },
  ]

  const total = courses?.length ?? 0
  const showing = sorted.length

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Content"
        title="Courses"
        description="Create and edit courses, then add modules and lessons on each course page."
        actions={
          <Button
            onClick={() => setCreating(true)}
            disabled={!categories || categories.length === 0}
            title={
              categories && categories.length === 0
                ? 'Create at least one category first'
                : undefined
            }
          >
            <Plus className="h-4 w-4" />
            New course
          </Button>
        }
      />

      {conflictBanner ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="min-w-0 text-pretty font-medium leading-snug">{conflictBanner}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 border-destructive/40 bg-background"
            onClick={() => setConflictBanner(null)}
          >
            Dismiss
          </Button>
        </div>
      ) : null}

      {!canReorderGlobally && (courses?.length ?? 0) > 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-start sm:justify-between dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          <div className="flex gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div className="space-y-1">
              <p className="font-medium">Catalog reorder uses the full course list</p>
              <p className="text-pretty text-xs leading-relaxed opacity-90">
                Show <strong>all categories</strong>, clear search, and sort by <strong>manual order</strong> so
                up/down matches the order saved to the server (same scope future bulk actions will use).
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0 border-amber-300/80 bg-background dark:border-amber-800"
            onClick={resetFiltersForCatalogReorder}
          >
            Reset filters for reorder
          </Button>
        </div>
      ) : null}

      {categories && categories.length === 0 ? (
        <Card className="border-dashed border-primary/30 bg-primary/[0.03]">
          <CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FolderOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Add a category first</p>
                <p className="text-sm text-muted-foreground">
                  Courses must belong to a category shown on the skills page.
                </p>
              </div>
            </div>
            <Button variant="outline" asChild>
              <Link to="/categories">Go to categories</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/70 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-10 border-border/80 pl-9 shadow-sm"
                placeholder="Search by title…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-10 w-full border-border/80 shadow-sm sm:w-52"
            >
              <option value="all">All categories</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </Select>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <ArrowUpDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="h-10 flex-1 border-border/80 shadow-sm sm:w-48"
              >
                <option value="order">Sort: manual order</option>
                <option value="title">Sort: title A–Z</option>
                <option value="created">Sort: newest first</option>
              </Select>
            </div>
          </div>
          <div className="text-xs font-medium text-muted-foreground sm:pl-2">
            Showing <span className="tabular-nums text-foreground">{showing}</span>
            {total !== showing ? (
              <>
                {' '}
                of <span className="tabular-nums text-foreground">{total}</span>
              </>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3 rounded-xl border border-border/80 bg-card p-6 shadow-sm">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <DataTable
          rows={sorted}
          columns={columns}
          getRowKey={(c) => c.id}
          empty={
            (courses ?? []).length === 0
              ? 'No courses yet. Create your first course to get started.'
              : 'No courses match your filters.'
          }
        />
      )}

      <Dialog open={creating} onOpenChange={(o) => !o && setCreating(false)}>
        <DialogContent className="flex max-h-[calc(100vh-2rem)] w-[calc(100vw-1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden border-border/80 p-0 sm:max-w-3xl lg:max-w-4xl">
          <DialogHeader className="border-b border-border/60 bg-muted/30 px-6 py-5 text-left">
            <DialogTitle>New course</DialogTitle>
            <DialogDescription>
              Creates the skill record. You will be taken to the course page to add modules and
              lessons.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <CourseForm
              onDone={() => setCreating(false)}
              onCreated={(course) => navigate(`/courses/${course.id}`)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <DestructiveConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => {
          if (o) return
          setDeleteTarget(null)
          setDeleteError(null)
        }}
        title="Delete course?"
        description={
          deleteTarget
            ? `Delete “${deleteTarget.title}” and all modules and lessons? This cannot be undone if the server allows it. Learner progress or submissions will block the delete.`
            : ''
        }
        confirmLabel="Delete course"
        isPending={remove.isPending}
        errorMessage={deleteError}
        onConfirm={() => {
          if (!deleteTarget) return
          remove.mutate({ id: deleteTarget.id })
        }}
        onHardConfirm={() => {
          if (!deleteTarget) return
          remove.mutate({ id: deleteTarget.id, force: true })
        }}
      />

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="flex max-h-[calc(100vh-2rem)] w-[calc(100vw-1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden border-border/80 p-0 sm:max-w-3xl lg:max-w-4xl">
          <DialogHeader className="border-b border-border/60 bg-muted/30 px-6 py-5 text-left">
            <DialogTitle>Edit course</DialogTitle>
            <DialogDescription>
              Update title, descriptions, category, duration, and display order.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {editing ? <CourseForm initial={editing} onDone={() => setEditing(null)} /> : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
