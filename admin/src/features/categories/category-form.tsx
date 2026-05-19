import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { categoriesApi, type Category } from './api'
import { Button } from '@shared/ui/button'
import { Input } from '@shared/ui/input'
import { Label } from '@shared/ui/label'
import { ApiError } from '@shared/api/http-client'

const schema = z.object({
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9_]+$/, 'lowercase letters, numbers, underscore'),
  label: z.string().min(2).max(60),
  is_visible: z.boolean().default(false),
  order: z.coerce.number().int().min(0),
})

type FormData = z.infer<typeof schema>

interface Props {
  initial?: Category
  onDone: () => void
}

/**
 * Creates or updates a category; slugs are locked after creation because courses reference them.
 */
export function CategoryForm({ initial, onDone }: Props) {
  const qc = useQueryClient()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      slug: initial?.slug ?? '',
      label: initial?.label ?? '',
      is_visible: initial?.is_visible ?? false,
      order: initial?.order ?? 0,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      initial ? categoriesApi.update(initial.id, data) : categoriesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] })
      toast.success(initial ? 'Category updated' : 'Category created')
      onDone()
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : 'Failed'
      toast.error(msg)
    },
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          placeholder="ai_automations"
          disabled={Boolean(initial)}
          {...register('slug')}
        />
        {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
        {initial && (
          <p className="text-xs text-muted-foreground">
            Slug is permanent because courses reference it.
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="label">Display name</Label>
        <Input id="label" placeholder="AI Automations" {...register('label')} />
        {errors.label && <p className="text-xs text-destructive">{errors.label.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="order">Order</Label>
        <Input id="order" type="number" min={0} {...register('order')} />
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
        <input type="checkbox" className="mt-1" {...register('is_visible')} />
        <span>
          <span className="block font-medium">Visible to learners</span>
          <span className="block text-xs leading-relaxed text-muted-foreground">
            Hidden categories hide every course, module, and lesson inside them.
          </span>
        </span>
      </label>
      <div className="sticky bottom-0 -mx-6 flex justify-end gap-2 border-t border-border/60 bg-card/95 px-6 py-4 backdrop-blur">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
        </Button>
      </div>
    </form>
  )
}
