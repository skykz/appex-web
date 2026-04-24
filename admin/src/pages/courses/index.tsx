import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, ChevronRight, Search } from 'lucide-react'
import { toast } from 'sonner'
import { coursesApi, type Course } from '@features/courses/api'
import { CourseForm } from '@features/courses/course-form'
import { categoriesApi } from '@features/categories/api'
import { Button } from '@shared/ui/button'
import { Input } from '@shared/ui/input'
import { Select } from '@shared/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@shared/ui/dialog'
import { DataTable, type Column } from '@shared/ui/data-table'
import { ApiError } from '@shared/api/http-client'

export function CoursesPage() {
  const qc = useQueryClient()
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
        search.trim()
          ? c.title.toLowerCase().includes(search.toLowerCase())
          : true
      )
  }, [courses, filter, search])

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
        <div className="flex items-center gap-2">
          <span className="text-xl">{c.emoji}</span>
          <div>
            <div className="font-medium">{c.title}</div>
            <div className="line-clamp-1 text-xs text-muted-foreground">{c.description}</div>
          </div>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (c) => c.category },
    {
      key: 'structure',
      header: 'Content',
      render: (c) => (
        <span className="text-muted-foreground">
          {c.module_count ?? 0} modules · {c.lesson_count ?? 0} lessons
        </span>
      ),
    },
    { key: 'duration', header: 'Duration', render: (c) => c.duration },
    {
      key: 'actions',
      header: '',
      className: 'w-44 text-right',
      render: (c) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/courses/${c.id}`}>
              Modules
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setEditing(c)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(c)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Courses</h1>
          <p className="text-sm text-muted-foreground">
            Create and edit courses, their modules, and lessons.
          </p>
        </div>
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
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="w-64 pl-9"
            placeholder="Search courses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-48">
          <option value="all">All categories</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.slug}>
              {c.label}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <DataTable
          rows={filtered}
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>New course</DialogTitle>
            <DialogDescription>
              This creates a skill record. Add modules and lessons from the course detail page.
            </DialogDescription>
          </DialogHeader>
          <CourseForm onDone={() => setCreating(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit course</DialogTitle>
          </DialogHeader>
          {editing && <CourseForm initial={editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
