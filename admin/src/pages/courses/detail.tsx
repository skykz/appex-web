import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { coursesApi, type Lesson, type Module } from '@features/courses/api'
import { ModuleForm } from '@features/courses/module-form'
import { LessonEditor } from '@features/courses/lesson-editor'
import { Button } from '@shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@shared/ui/dialog'
import { ApiError } from '@shared/api/http-client'

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const courseId = Number(id)
  const qc = useQueryClient()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'course', courseId],
    queryFn: () => coursesApi.detail(courseId),
    enabled: Number.isFinite(courseId),
  })

  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [creatingModule, setCreatingModule] = useState(false)
  const [editingModule, setEditingModule] = useState<Module | null>(null)
  const [lessonEditor, setLessonEditor] = useState<{
    moduleId: number
    lesson?: Lesson
  } | null>(null)

  const removeModule = useMutation({
    mutationFn: (mid: number) => coursesApi.removeModule(mid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'course', courseId] })
      toast.success('Module deleted')
    },
    onError: (err: unknown) =>
      toast.error(err instanceof ApiError ? err.message : 'Failed'),
  })

  const removeLesson = useMutation({
    mutationFn: (lid: number) => coursesApi.removeLesson(lid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'course', courseId] })
      toast.success('Lesson deleted')
    },
    onError: (err: unknown) =>
      toast.error(err instanceof ApiError ? err.message : 'Failed'),
  })

  if (!Number.isFinite(courseId)) {
    return <div className="p-8 text-sm text-destructive">Invalid course id.</div>
  }

  if (isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>
  }
  if (isError || !data) {
    return (
      <div className="p-8 text-sm text-destructive">
        Failed to load course: {(error as Error)?.message}
      </div>
    )
  }

  return (
    <div className="space-y-6 p-8">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/courses">
          <ArrowLeft className="h-4 w-4" />
          All courses
        </Link>
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{data.emoji}</span>
            <div>
              <h1 className="text-2xl font-bold">{data.title}</h1>
              <p className="text-sm text-muted-foreground">{data.description}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-2 py-0.5">{data.category}</span>
            <span className="rounded-full bg-muted px-2 py-0.5">{data.duration}</span>
            <span className="rounded-full bg-muted px-2 py-0.5">order {data.order}</span>
          </div>
        </div>
        <Button onClick={() => setCreatingModule(true)}>
          <Plus className="h-4 w-4" />
          Add module
        </Button>
      </div>

      <div className="space-y-3">
        {data.modules.length === 0 && (
          <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
            No modules yet. Add one to start building lessons.
          </div>
        )}
        {data.modules.map((m) => {
          const isOpen = expanded[m.id] ?? true
          return (
            <div key={m.id} className="rounded-lg border bg-card">
              <div className="flex items-center gap-2 p-4">
                <button
                  type="button"
                  className="flex flex-1 items-center gap-2 text-left"
                  onClick={() => setExpanded((s) => ({ ...s, [m.id]: !isOpen }))}
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span className="font-medium">{m.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {m.lessons.length} lessons
                  </span>
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setLessonEditor({ moduleId: m.id })}
                >
                  <Plus className="h-4 w-4" />
                  Lesson
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditingModule(m)}
                  title="Edit module"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (
                      !confirm(
                        `Delete module "${m.title}" and all its lessons? This cannot be undone.`
                      )
                    )
                      return
                    removeModule.mutate(m.id)
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              {isOpen && (
                <div className="border-t">
                  {m.lessons.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      No lessons yet.
                    </div>
                  ) : (
                    <ul className="divide-y">
                      {m.lessons.map((l) => (
                        <li key={l.id} className="flex items-center gap-3 px-6 py-3">
                          <span className="text-xl">{l.emoji}</span>
                          <div className="flex-1">
                            <div className="text-sm font-medium">
                              {l.label} — {l.title}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {l.content.length} step{l.content.length !== 1 && 's'} · order{' '}
                              {l.order}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setLessonEditor({ moduleId: m.id, lesson: l })
                            }
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (!confirm(`Delete lesson "${l.title}"?`)) return
                              removeLesson.mutate(l.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Dialog
        open={creatingModule}
        onOpenChange={(o) => !o && setCreatingModule(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New module</DialogTitle>
          </DialogHeader>
          <ModuleForm courseId={courseId} onDone={() => setCreatingModule(false)} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingModule)}
        onOpenChange={(o) => !o && setEditingModule(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit module</DialogTitle>
          </DialogHeader>
          {editingModule && (
            <ModuleForm
              courseId={courseId}
              initial={editingModule}
              onDone={() => setEditingModule(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(lessonEditor)} onOpenChange={(o) => !o && setLessonEditor(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {lessonEditor?.lesson ? 'Edit lesson' : 'New lesson'}
            </DialogTitle>
            <DialogDescription>
              Lessons are made of steps; each step has blocks rendered in the user app.
            </DialogDescription>
          </DialogHeader>
          {lessonEditor && (
            <LessonEditor
              moduleId={lessonEditor.moduleId}
              initial={lessonEditor.lesson}
              onDone={() => setLessonEditor(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
