import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { coursesApi, type Course } from './api'
import { categoriesApi } from '@features/categories/api'
import { Button } from '@shared/ui/button'
import { Input } from '@shared/ui/input'
import { Textarea } from '@shared/ui/textarea'
import { Label } from '@shared/ui/label'
import { Select } from '@shared/ui/select'
import { ApiError } from '@shared/api/http-client'

const schema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().min(2).max(300),
  about: z.string().min(2),
  emoji: z.string().min(1).max(8),
  category: z.string().min(1, 'Pick a category'),
  duration: z.string().min(1),
  order: z.coerce.number().int().min(0),
})

type FormData = z.infer<typeof schema>

interface Props {
  initial?: Course
  onDone: () => void
}

export function CourseForm({ initial, onDone }: Props) {
  const qc = useQueryClient()
  const { data: categories } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: categoriesApi.list,
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initial?.title ?? '',
      description: initial?.description ?? '',
      about: initial?.about ?? '',
      emoji: initial?.emoji ?? '📘',
      category: initial?.category ?? '',
      duration: initial?.duration ?? '2 hours',
      order: initial?.order ?? 0,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      initial ? coursesApi.update(initial.id, data) : coursesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'courses'] })
      toast.success(initial ? 'Course updated' : 'Course created')
      onDone()
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : 'Failed'
      toast.error(msg)
    },
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="grid grid-cols-[1fr_5rem] gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" placeholder="Build Gmail Manager Bot" {...register('title')} />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="emoji">Emoji</Label>
          <Input id="emoji" placeholder="🤖" {...register('emoji')} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Short description</Label>
        <Input
          id="description"
          placeholder="Learn how to build…"
          {...register('description')}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="about">Long description (about)</Label>
        <Textarea id="about" rows={5} {...register('about')} />
        {errors.about && <p className="text-xs text-destructive">{errors.about.message}</p>}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <Select id="category" {...register('category')}>
            <option value="">— pick one —</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.slug}>
                {c.label}
              </option>
            ))}
          </Select>
          {errors.category && (
            <p className="text-xs text-destructive">{errors.category.message}</p>
          )}
          {categories && categories.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No categories yet. Create one in the Categories page.
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="duration">Duration</Label>
          <Input id="duration" placeholder="2 hours" {...register('duration')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="order">Order</Label>
          <Input id="order" type="number" min={0} {...register('order')} />
        </div>
      </div>

      <div className="flex justify-end gap-2">
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
