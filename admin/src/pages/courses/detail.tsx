import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  BarChart3,
  EyeOff,
  FileUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { coursesApi, type ImportedLessonDraft, type ImportedModuleDraft, type Lesson, type Module } from '@features/courses/api'
import { ModuleForm } from '@features/courses/module-form'
import { LessonEditor } from '@features/courses/lesson-editor'
import { LessonImportDialog } from '@features/courses/lesson-import-dialog'
import { ModuleImportDialog } from '@features/courses/module-import-dialog'
import { LessonEngagementDialog } from '@features/courses/lesson-engagement-dialog'
import { Button } from '@shared/ui/button'
import { Card, CardContent } from '@shared/ui/card'
import { Skeleton } from '@shared/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@shared/ui/dialog'
import { DestructiveConfirmDialog } from '@shared/ui/destructive-confirm-dialog'
import { EmojiOrImageBadge } from '@shared/ui/emoji-or-image-badge'
import { ApiError } from '@shared/api/http-client'
import { swapAdjacentEntityIds } from '@shared/lib/reorder-payloads'

type CourseBuilderDeleteTarget =
  | { kind: 'module'; id: number; title: string }
  | { kind: 'lesson'; id: number; title: string }

/**
 * Course builder: lists modules and lessons, and hosts dialogs for module and lesson editors.
 */
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
  const [moduleImportOpen, setModuleImportOpen] = useState(false)
  const [editingModule, setEditingModule] = useState<Module | null>(null)
  const [lessonEditor, setLessonEditor] = useState<{
    moduleId: number
    lesson?: Lesson
    draft?: ImportedLessonDraft
  } | null>(null)
  const [lessonImportModuleId, setLessonImportModuleId] = useState<number | null>(null)
  const [engagementLesson, setEngagementLesson] = useState<Lesson | null>(null)
  const [conflictBanner, setConflictBanner] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CourseBuilderDeleteTarget | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const removeModule = useMutation({
    mutationFn: (args: { id: number; force?: boolean }) => coursesApi.removeModule(args.id, args),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'course', courseId] })
      setConflictBanner(null)
      setDeleteTarget(null)
      setDeleteError(null)
      toast.success('Module deleted')
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : 'Could not delete module.'
      setDeleteError(msg)
      if (err instanceof ApiError && err.status === 409) {
        setConflictBanner(msg)
        return
      }
      toast.error(msg)
    },
  })

  const removeLesson = useMutation({
    mutationFn: (args: { id: number; force?: boolean }) => coursesApi.removeLesson(args.id, args),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'course', courseId] })
      setConflictBanner(null)
      setDeleteTarget(null)
      setDeleteError(null)
      toast.success('Lesson deleted')
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : 'Could not delete lesson.'
      setDeleteError(msg)
      if (err instanceof ApiError && err.status === 409) {
        setConflictBanner(msg)
        return
      }
      toast.error(msg)
    },
  })

  const reorderModulesMutation = useMutation({
    mutationFn: (orderedIds: number[]) => coursesApi.reorderModules(courseId, orderedIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'course', courseId] })
      qc.invalidateQueries({ queryKey: ['admin', 'courses'] })
      toast.success('Module order saved')
    },
    onError: (err: unknown) =>
      toast.error(err instanceof ApiError ? err.message : 'Could not reorder modules'),
  })

  const reorderLessonsMutation = useMutation({
    mutationFn: (args: { moduleId: number; orderedIds: number[] }) =>
      coursesApi.reorderLessons(args.moduleId, args.orderedIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'course', courseId] })
      toast.success('Lesson order saved')
    },
    onError: (err: unknown) =>
      toast.error(err instanceof ApiError ? err.message : 'Could not reorder lessons'),
  })

  const reorderBusy = reorderModulesMutation.isPending || reorderLessonsMutation.isPending

  /**
   * Moves a module up or down and persists the full ordered id list (dense indices on the server).
   */
  function moveModule(moduleIndex: number, direction: -1 | 1) {
    if (!data) return
    const next = swapAdjacentEntityIds(data.modules, moduleIndex, direction)
    if (next) reorderModulesMutation.mutate(next)
  }

  /**
   * Moves a lesson within its module; order must include every lesson id in that module.
   */
  function moveLesson(
    moduleId: number,
    lessonIndex: number,
    direction: -1 | 1,
    lessons: Lesson[]
  ) {
    const next = swapAdjacentEntityIds(lessons, lessonIndex, direction)
    if (next) reorderLessonsMutation.mutate({ moduleId, orderedIds: next })
  }

  async function createImportedModule(draft: ImportedModuleDraft) {
    const module = await coursesApi.createModule(courseId, { title: draft.title, is_visible: false })
    for (const lesson of draft.lessons) {
      await coursesApi.createLesson(module.id, {
        label: lesson.label,
        title: lesson.title,
        emoji: lesson.emoji,
        content: lesson.steps,
        is_visible: false,
      })
    }
    setExpanded((current) => ({ ...current, [module.id]: true }))
    await qc.invalidateQueries({ queryKey: ['admin', 'course', courseId] })
    await qc.invalidateQueries({ queryKey: ['admin', 'courses'] })
  }

  if (!Number.isFinite(courseId)) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Invalid course id.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-40 w-full max-w-3xl rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }
  if (isError || !data) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Failed to load course: {(error as Error)?.message}
      </div>
    )
  }

  return (
    <div className="space-y-8">
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

      <Button variant="ghost" size="sm" className="-ml-2 gap-2 text-muted-foreground hover:text-foreground" asChild>
        <Link to="/courses">
          <ArrowLeft className="h-4 w-4" />
          All courses
        </Link>
      </Button>

      <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-card via-card to-muted/30 shadow-md">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-1 gap-4 sm:gap-5">
              <EmojiOrImageBadge
                value={data.emoji}
                frameClassName="h-16 w-16 text-4xl shadow-inner sm:h-20 sm:w-20"
              />
              <div className="min-w-0 space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{data.title}</h1>
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{data.description}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {!data.is_visible ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/70 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                      <EyeOff className="h-3.5 w-3.5" />
                      Hidden course
                    </span>
                  ) : null}
                  <span className="inline-flex items-center rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-foreground/90">
                    {data.category}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-foreground/90">
                    {data.duration}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs tabular-nums text-muted-foreground">
                    Order {data.order}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="outline" onClick={() => setModuleImportOpen(true)}>
                <FileUp className="h-4 w-4" />
                Import module ZIP
              </Button>
              <Button onClick={() => setCreatingModule(true)} className="shadow-sm">
                <Plus className="h-4 w-4" />
                Add module
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {data.modules.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-12 text-center text-sm text-muted-foreground">
            No modules yet. Add one to start building lessons.
          </div>
        )}
        {data.modules.map((m, moduleIndex) => {
          const isOpen = expanded[m.id] ?? true
          return (
            <Card
              key={m.id}
              className="overflow-hidden border-border/70 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex flex-col gap-3 border-b border-border/50 bg-muted/25 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left transition-colors hover:bg-muted/40 sm:px-1 sm:py-0.5"
                  onClick={() => setExpanded((s) => ({ ...s, [m.id]: !isOpen }))}
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate font-semibold">{m.title}</span>
                  {!m.is_visible ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-300/70 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                      <EyeOff className="h-3 w-3" />
                      Hidden
                    </span>
                  ) : null}
                  <span className="shrink-0 rounded-full bg-background/80 px-2 py-0.5 text-xs text-muted-foreground ring-1 ring-border/60">
                    {m.lessons.length} lessons
                  </span>
                </button>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <div className="flex items-center rounded-md border border-border/60 bg-background/80 p-0.5">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      disabled={reorderBusy || moduleIndex <= 0}
                      title="Move module up"
                      aria-label={`Move module ${m.title} up`}
                      onClick={() => moveModule(moduleIndex, -1)}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      disabled={reorderBusy || moduleIndex >= data.modules.length - 1}
                      title="Move module down"
                      aria-label={`Move module ${m.title} down`}
                      onClick={() => moveModule(moduleIndex, 1)}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border/80 bg-background shadow-none"
                    onClick={() => setLessonEditor({ moduleId: m.id })}
                  >
                    <Plus className="h-4 w-4" />
                    Lesson
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border/80 bg-background shadow-none"
                    onClick={() => setLessonImportModuleId(m.id)}
                  >
                    <FileUp className="h-4 w-4" />
                    Import DOCX
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9"
                    onClick={() => setEditingModule(m)}
                    title="Edit module"
                    aria-label={`Edit module ${m.title}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9"
                    onClick={() => {
                      setDeleteTarget({ kind: 'module', id: m.id, title: m.title })
                      setDeleteError(null)
                    }}
                    title="Delete module"
                    aria-label={`Delete module ${m.title}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              {isOpen && (
                <div>
                  {m.lessons.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No lessons yet.
                    </div>
                  ) : (
                    <ul className="divide-y divide-border/60">
                      {m.lessons.map((l, lessonIndex) => (
                        <li
                          key={l.id}
                          className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:gap-3 sm:px-6"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 text-sm font-medium leading-snug">
                              <span>
                                {l.label} — {l.title}
                              </span>
                              {!l.is_visible ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/70 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                                  <EyeOff className="h-3 w-3" />
                                  Hidden
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {l.content.length} step{l.content.length !== 1 && 's'}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1 sm:ml-auto">
                            <div className="mr-1 flex items-center rounded-md border border-border/60 bg-background/80 p-0.5">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                disabled={reorderBusy || lessonIndex <= 0}
                                title="Move lesson up"
                                aria-label={`Move lesson ${l.title} up`}
                                onClick={() => moveLesson(m.id, lessonIndex, -1, m.lessons)}
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                disabled={reorderBusy || lessonIndex >= m.lessons.length - 1}
                                title="Move lesson down"
                                aria-label={`Move lesson ${l.title} down`}
                                onClick={() => moveLesson(m.id, lessonIndex, 1, m.lessons)}
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 border-border/80"
                              title="Quiz attempts & submissions"
                              onClick={() => setEngagementLesson(l)}
                            >
                              <BarChart3 className="h-4 w-4" />
                              Insights
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 border-border/80"
                              onClick={() => setLessonEditor({ moduleId: m.id, lesson: l })}
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => {
                                setDeleteTarget({ kind: 'lesson', id: l.id, title: l.title })
                                setDeleteError(null)
                              }}
                              title="Delete lesson"
                              aria-label={`Delete lesson ${l.title}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <Dialog open={creatingModule} onOpenChange={(o) => !o && setCreatingModule(false)}>
        <DialogContent className="flex max-h-[calc(100vh-2rem)] w-[calc(100vw-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden border-border/80 p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-border/60 bg-muted/30 px-6 py-5 text-left">
            <DialogTitle>New module</DialogTitle>
            <DialogDescription>Add a section that will contain ordered lessons.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <ModuleForm courseId={courseId} onDone={() => setCreatingModule(false)} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingModule)} onOpenChange={(o) => !o && setEditingModule(null)}>
        <DialogContent className="flex max-h-[calc(100vh-2rem)] w-[calc(100vw-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden border-border/80 p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-border/60 bg-muted/30 px-6 py-5 text-left">
            <DialogTitle>Edit module</DialogTitle>
            <DialogDescription>Rename the module or change its order.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {editingModule ? (
              <ModuleForm
                key={editingModule.id}
                courseId={courseId}
                initial={editingModule}
                onDone={() => setEditingModule(null)}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {engagementLesson ? (
        <LessonEngagementDialog
          lesson={engagementLesson}
          open
          onOpenChange={(o) => !o && setEngagementLesson(null)}
        />
      ) : null}

      <DestructiveConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => {
          if (o) return
          setDeleteTarget(null)
          setDeleteError(null)
        }}
        title={deleteTarget?.kind === 'module' ? 'Delete module?' : 'Delete lesson?'}
        description={
          deleteTarget?.kind === 'module'
            ? `Delete “${deleteTarget.title}” and all lessons inside it? Learner activity on those lessons will block the delete.`
            : deleteTarget?.kind === 'lesson'
              ? `Delete “${deleteTarget.title}”? Progress, submissions, or quiz attempts will block the delete.`
              : ''
        }
        confirmLabel={deleteTarget?.kind === 'module' ? 'Delete module' : 'Delete lesson'}
        isPending={removeModule.isPending || removeLesson.isPending}
        errorMessage={deleteError}
        onConfirm={() => {
          if (!deleteTarget) return
          if (deleteTarget.kind === 'module') removeModule.mutate({ id: deleteTarget.id })
          else removeLesson.mutate({ id: deleteTarget.id })
        }}
        onHardConfirm={() => {
          if (!deleteTarget) return
          if (deleteTarget.kind === 'module') {
            removeModule.mutate({ id: deleteTarget.id, force: true })
          } else {
            removeLesson.mutate({ id: deleteTarget.id, force: true })
          }
        }}
      />

      <Dialog open={Boolean(lessonEditor)} onOpenChange={(o) => !o && setLessonEditor(null)}>
        <DialogContent className="flex max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-5xl flex-col gap-0 overflow-hidden border-border/80 p-0 sm:max-w-5xl lg:max-w-6xl">
          {lessonEditor ? (
            <LessonEditor
              key={lessonEditor.lesson ? `lesson-${lessonEditor.lesson.id}` : `new-${lessonEditor.moduleId}`}
              moduleId={lessonEditor.moduleId}
              initial={lessonEditor.lesson}
              draft={lessonEditor.draft}
              onDone={async () => {
                await qc.invalidateQueries({ queryKey: ['admin', 'course', courseId] })
                await qc.invalidateQueries({ queryKey: ['admin', 'courses'] })
                setLessonEditor(null)
              }}
              onCancel={() => setLessonEditor(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <LessonImportDialog
        open={lessonImportModuleId !== null}
        onOpenChange={(open) => !open && setLessonImportModuleId(null)}
        onGenerated={(draft) => {
          if (lessonImportModuleId === null) return
          const moduleId = lessonImportModuleId
          setLessonImportModuleId(null)
          setLessonEditor({ moduleId, draft })
        }}
      />

      <ModuleImportDialog
        open={moduleImportOpen}
        onOpenChange={setModuleImportOpen}
        onGenerated={createImportedModule}
      />
    </div>
  )
}
