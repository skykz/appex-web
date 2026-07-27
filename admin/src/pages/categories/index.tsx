import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { EyeOff, Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { categoriesApi, type Category } from '@features/categories/api'
import { CategoryForm } from '@features/categories/category-form'
import { Button } from '@shared/ui/button'
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
import { DestructiveConfirmDialog } from '@shared/ui/destructive-confirm-dialog'
import { QueryErrorPanel } from '@shared/ui/query-error-panel'
import { ApiError } from '@shared/api/http-client'

/**
 * CRUD UI for skill categories; deletion is blocked server-side when courses still reference a row.
 */
export function CategoriesPage() {
  const qc = useQueryClient()
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: categoriesApi.list,
  })

  const [editing, setEditing] = useState<Category | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const remove = useMutation({
    mutationFn: (args: { id: number; force?: boolean }) => categoriesApi.remove(args.id, args),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] })
      setDeleteTarget(null)
      setDeleteError(null)
      toast.success('Category deleted')
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.status === 409
            ? err.message
            : err.message
          : 'Could not delete category.'
      setDeleteError(msg)
      toast.error(msg)
    },
  })

  const columns: Column<Category>[] = [
    {
      key: 'label',
      header: 'Name',
      render: (c) => (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{c.label}</span>
          {!c.is_visible ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/70 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
              <EyeOff className="h-3 w-3" />
              Hidden
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'slug',
      header: 'Slug',
      render: (c) => (
        <code className="rounded-md border border-border/60 bg-muted/50 px-2 py-0.5 text-xs font-mono">
          {c.slug}
        </code>
      ),
    },
    {
      key: 'count',
      header: 'Courses',
      render: (c) => (
        <span className="tabular-nums text-muted-foreground">{c.skill_count ?? 0}</span>
      ),
    },
    { key: 'order', header: 'Order', render: (c) => <span className="tabular-nums">{c.order}</span> },
    {
      key: 'actions',
      header: '',
      className: 'w-32 text-right',
      render: (c) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setEditing(c)}
            aria-label={`Edit category ${c.label}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setDeleteTarget(c)
              setDeleteError(null)
            }}
            aria-label={`Delete category ${c.label}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Structure"
        title="Categories"
        description="Group courses into categories shown on the user skills page."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            New category
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3 rounded-xl border border-border/80 bg-card p-6 shadow-sm">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : isError ? (
        <QueryErrorPanel error={error} what="categories" onRetry={() => refetch()} />
      ) : (
        <DataTable
          rows={data ?? []}
          columns={columns}
          getRowKey={(c) => c.id}
          empty="No categories yet. Create one to get started."
        />
      )}

      <Dialog open={creating} onOpenChange={(o) => !o && setCreating(false)}>
        <DialogContent className="flex max-h-[calc(100vh-2rem)] w-[calc(100vw-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden border-border/80 p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-border/60 bg-muted/30 px-6 py-5 text-left">
            <DialogTitle>New category</DialogTitle>
            <DialogDescription>
              Slug is used internally and must be unique (letters, numbers, underscores).
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <CategoryForm onDone={() => setCreating(false)} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="flex max-h-[calc(100vh-2rem)] w-[calc(100vw-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden border-border/80 p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-border/60 bg-muted/30 px-6 py-5 text-left">
            <DialogTitle>Edit category</DialogTitle>
            <DialogDescription>Update label, slug, or sort order.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {editing ? (
              <CategoryForm key={editing.id} initial={editing} onDone={() => setEditing(null)} />
            ) : null}
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
        title="Delete category?"
        description={
          deleteTarget
            ? `Delete “${deleteTarget.label}”? Categories with courses will be blocked by the server.`
            : ''
        }
        confirmLabel="Delete category"
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
    </div>
  )
}
