import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { lessonEmoji } from '@appex/lesson-schema'
import { coursesApi, type Course } from './api'
import { categoriesApi } from '@features/categories/api'
import { Button } from '@shared/ui/button'
import { Input } from '@shared/ui/input'
import { Textarea } from '@shared/ui/textarea'
import { Label } from '@shared/ui/label'
import { Select } from '@shared/ui/select'
import { ApiError } from '@shared/api/http-client'
import { MediaBadgeField } from '@shared/ui/media-badge-field'

/** Exported for tests and any server/client shared validation of course metadata. */
export const courseFormSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().min(2).max(300),
  about: z.string().min(2),
  emoji: lessonEmoji,
  category: z.string().min(1, 'Pick a category'),
  duration: z.string().min(1),
})

type FormData = z.infer<typeof courseFormSchema>

interface Props {
  initial?: Course
  /** Called after any successful save; closes dialogs when wired by the parent. */
  onDone: () => void
  /** Invoked only after a successful create so the parent can route to the new course. */
  onCreated?: (course: Course) => void
}

/**
 * Form for creating or updating course metadata; validates with zod and syncs React Query cache.
 */
export function CourseForm({ initial, onDone, onCreated }: Props) {
  const qc = useQueryClient()
  const { data: categories } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: categoriesApi.list,
  })

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(courseFormSchema) as Resolver<FormData>,
    defaultValues: {
      title: initial?.title ?? '',
      description: initial?.description ?? '',
      about: initial?.about ?? '',
      emoji: initial?.emoji ?? '📘',
      category: initial?.category ?? '',
      duration: initial?.duration ?? '2 hours',
    },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      initial ? coursesApi.update(initial.id, data) : coursesApi.create(data),
    onSuccess: (course) => {
      qc.invalidateQueries({ queryKey: ['admin', 'courses'] })
      toast.success(initial ? 'Course updated' : 'Course created')
      if (!initial && onCreated) onCreated(course)
      onDone()
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : 'Failed'
      toast.error(msg)
    },
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
      <section className="rounded-xl border border-border/60 bg-muted/20 p-4 shadow-inner">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Basics
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            className="border-border/80 bg-background"
            placeholder="Build Gmail Manager Bot"
            {...register('title')}
          />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>
        <Controller
          name="emoji"
          control={control}
          render={({ field }) => (
            <MediaBadgeField
              label="Catalog badge"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.emoji?.message}
              helperText="Emoji, image URL, site path, or upload a PNG/JPEG/WebP/GIF (stored with the course)."
            />
          )}
        />
      </section>

      <section className="rounded-xl border border-border/60 bg-muted/20 p-4 shadow-inner">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Descriptions
        </p>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="description">Short description</Label>
            <Input
              id="description"
              className="border-border/80 bg-background"
              placeholder="Learn how to build…"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="about">Long description (about)</Label>
            <Textarea
              id="about"
              rows={5}
              className="resize-y border-border/80 bg-background"
              {...register('about')}
            />
            {errors.about && <p className="text-xs text-destructive">{errors.about.message}</p>}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-muted/20 p-4 shadow-inner">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Placement
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <Select id="category" className="border-border/80 bg-background" {...register('category')}>
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
            <Input
              id="duration"
              className="border-border/80 bg-background"
              placeholder="2 hours"
              {...register('duration')}
            />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border/60 pt-4">
        <Button type="button" variant="outline" className="border-border/80" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
        </Button>
      </div>
    </form>
  )
}
