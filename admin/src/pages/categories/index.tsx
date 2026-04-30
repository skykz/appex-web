import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
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
import { ApiError } from '@shared/api/http-client'

/**
 * CRUD UI for skill categories; deletion is blocked server-side when courses still reference a row.
 */
export function CategoriesPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: categoriesApi.list,
  })

  const [editing, setEditing] = useState<Category | null>(null)
  const [creating, setCreating] = useState(false)

  const remove = useMutation({
    mutationFn: (id: number) => categoriesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] })
      toast.success('Category deleted')
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.status === 409
            ? 'Cannot delete: category still has courses.'
            : err.message
          : 'Failed'
      toast.error(msg)
    },
  })

  /** Confirms destructive delete for a category row. */
  function onDelete(c: Category) {
    if (!confirm(`Delete category "${c.label}"? This cannot be undone.`)) return
    remove.mutate(c.id)
  }

  const columns: Column<Category>[] = [
    { key: 'label', header: 'Name', render: (c) => <span className="font-medium">{c.label}</span> },
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
      ) : (
        <DataTable
          rows={data ?? []}
          columns={columns}
          getRowKey={(c) => c.id}
          empty="No categories yet. Create one to get started."
        />
      )}

      <Dialog open={creating} onOpenChange={(o) => !o && setCreating(false)}>
        <DialogContent className="max-w-lg gap-0 overflow-hidden border-border/80 p-0">
          <DialogHeader className="border-b border-border/60 bg-muted/30 px-6 py-5 text-left">
            <DialogTitle>New category</DialogTitle>
            <DialogDescription>
              Slug is used internally and must be unique (letters, numbers, underscores).
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5">
            <CategoryForm onDone={() => setCreating(false)} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg gap-0 overflow-hidden border-border/80 p-0">
          <DialogHeader className="border-b border-border/60 bg-muted/30 px-6 py-5 text-left">
            <DialogTitle>Edit category</DialogTitle>
            <DialogDescription>Update label, slug, or sort order.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5">
            {editing ? <CategoryForm initial={editing} onDone={() => setEditing(null)} /> : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
