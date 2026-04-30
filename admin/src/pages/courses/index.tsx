import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, ChevronRight, Search, ArrowUpDown, FolderOpen } from 'lucide-react'
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
import { ApiError } from '@shared/api/http-client'

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
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('order')

  const categoryLabelBySlug = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of categories ?? []) m.set(c.slug, c.label)
    return m
  }, [categories])

  const remove = useMutation({
    mutationFn: (id: number) => coursesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'courses'] })
      toast.success('Course deleted')
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : 'Failed'
      toast.error(msg)
    },
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

  /** Prompts before permanently removing a course and its content tree. */
  function onDelete(c: Course) {
    if (
      !confirm(
        `Delete course "${c.title}"? This will also delete its modules and lessons. User progress will be lost.`
      )
    )
      return
    remove.mutate(c.id)
  }

  const columns: Column<Course>[] = [
    {
      key: 'title',
      header: 'Course',
      render: (c) => (
        <div className="flex items-center gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-xl shadow-inner"
            aria-hidden
          >
            {c.emoji}
          </span>
          <div className="min-w-0">
            <div className="font-medium leading-snug">{c.title}</div>
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
      className: 'w-48 text-right',
      render: (c) => (
        <div className="flex justify-end gap-1">
          <Button variant="outline" size="sm" className="h-8 border-border/80 bg-background shadow-none" asChild>
            <Link to={`/courses/${c.id}`}>
              Open
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(c)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(c)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
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
        <DialogContent className="max-w-xl gap-0 overflow-hidden border-border/80 p-0 sm:max-w-xl">
          <DialogHeader className="border-b border-border/60 bg-muted/30 px-6 py-5 text-left">
            <DialogTitle>New course</DialogTitle>
            <DialogDescription>
              Creates the skill record. You will be taken to the course page to add modules and
              lessons.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5">
            <CourseForm
              onDone={() => setCreating(false)}
              onCreated={(course) => navigate(`/courses/${course.id}`)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl gap-0 overflow-hidden border-border/80 p-0 sm:max-w-xl">
          <DialogHeader className="border-b border-border/60 bg-muted/30 px-6 py-5 text-left">
            <DialogTitle>Edit course</DialogTitle>
            <DialogDescription>
              Update title, descriptions, category, duration, and display order.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5">
            {editing ? <CourseForm initial={editing} onDone={() => setEditing(null)} /> : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
