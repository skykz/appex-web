import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { categoriesApi, type Category } from '@features/categories/api'
import { CategoryForm } from '@features/categories/category-form'
import { Button } from '@shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@shared/ui/dialog'
import { DataTable, type Column } from '@shared/ui/data-table'
import { ApiError } from '@shared/api/http-client'

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

  function onDelete(c: Category) {
    if (!confirm(`Delete category "${c.label}"? This cannot be undone.`)) return
    remove.mutate(c.id)
  }

  const columns: Column<Category>[] = [
    { key: 'label', header: 'Name', render: (c) => <span className="font-medium">{c.label}</span> },
    {
      key: 'slug',
      header: 'Slug',
      render: (c) => <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{c.slug}</code>,
    },
    {
      key: 'count',
      header: 'Courses',
      render: (c) => <span className="text-muted-foreground">{c.skill_count ?? 0}</span>,
    },
    { key: 'order', header: 'Order', render: (c) => c.order },
    {
      key: 'actions',
      header: '',
      className: 'w-32 text-right',
      render: (c) => (
        <div className="flex justify-end gap-1">
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
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Group courses into categories shown on the user skills page.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          New category
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <DataTable
          rows={data ?? []}
          columns={columns}
          getRowKey={(c) => c.id}
          empty="No categories yet. Create one to get started."
        />
      )}

      <Dialog open={creating} onOpenChange={(o) => !o && setCreating(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New category</DialogTitle>
            <DialogDescription>
              Slug is used internally and must be unique (letters, numbers, underscores).
            </DialogDescription>
          </DialogHeader>
          <CategoryForm onDone={() => setCreating(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
          </DialogHeader>
          {editing && <CategoryForm initial={editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
