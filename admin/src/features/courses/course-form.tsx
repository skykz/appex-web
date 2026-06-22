import { useState, useMemo } from 'react'
import { useForm, Controller, useWatch, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Eye } from 'lucide-react'
import { lessonEmoji } from '@appex/lesson-schema'
import { coursesApi, type Course, type CourseInput } from './api'
import { categoriesApi } from '@features/categories/api'
import { Button } from '@shared/ui/button'
import { Input } from '@shared/ui/input'
import { Textarea } from '@shared/ui/textarea'
import { Label } from '@shared/ui/label'
import { Select } from '@shared/ui/select'
import { ApiError } from '@shared/api/http-client'
import { MediaBadgeField } from '@shared/ui/media-badge-field'
import { parseCertTags } from './cert-form-utils'
import { CertificatePreviewDialog } from './certificate-preview-dialog'

/** Exported for tests and any server/client shared validation of course metadata. */
export const courseFormSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().min(2).max(300),
  about: z.string().min(2),
  emoji: lessonEmoji,
  category: z.string().min(1, 'Pick a category'),
  duration: z.string().min(1),
  is_visible: z.boolean().default(false),
  cert_title: z.string().max(200).optional(),
  cert_description: z.string().max(600).optional(),
  cert_tags_text: z.string().max(500).optional(),
})

type FormData = z.infer<typeof courseFormSchema>

/** Builds the API payload from validated form values. */
export function toCoursePayload(data: FormData): CourseInput {
  const { cert_tags_text, cert_title, cert_description, ...rest } = data
  return {
    ...rest,
    cert_title: cert_title?.trim() || null,
    cert_description: cert_description?.trim() || null,
    cert_tags: parseCertTags(cert_tags_text),
  }
}

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
  const [previewOpen, setPreviewOpen] = useState(false)
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
      is_visible: initial?.is_visible ?? false,
      cert_title: initial?.cert_title ?? '',
      cert_description: initial?.cert_description ?? '',
      cert_tags_text: (initial?.cert_tags ?? []).join('\n'),
    },
  })

  const watchedTitle = useWatch({ control, name: 'title' })
  const watchedCertTitle = useWatch({ control, name: 'cert_title' })
  const watchedCertDescription = useWatch({ control, name: 'cert_description' })
  const watchedCertTags = useWatch({ control, name: 'cert_tags_text' })

  const previewDraft = useMemo(
    () => ({
      courseTitle: watchedTitle,
      cert_title: watchedCertTitle,
      cert_description: watchedCertDescription,
      cert_tags_text: watchedCertTags,
    }),
    [watchedTitle, watchedCertTitle, watchedCertDescription, watchedCertTags]
  )

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload: CourseInput = toCoursePayload(data)
      return initial ? coursesApi.update(initial.id, payload) : coursesApi.create(payload)
    },
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
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
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
      </div>

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
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-border/70 bg-background/80 p-3 text-sm">
          <input type="checkbox" className="mt-1" {...register('is_visible')} />
          <span>
            <span className="block font-medium">Visible to learners</span>
            <span className="block text-xs leading-relaxed text-muted-foreground">
              Hidden courses hide all modules and lessons in this course.
            </span>
          </span>
        </label>
      </section>

      <section className="rounded-xl border border-border/60 bg-muted/20 p-4 shadow-inner">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Certificate
        </p>
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
          Content printed on completion certificates for this course. Learner name, issue date, and
          credential ID are generated automatically per user.
        </p>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cert_title">Certificate title</Label>
            <Textarea
              id="cert_title"
              rows={2}
              className="resize-y border-border/80 bg-background"
              placeholder={'MASTER THE\nCLAUDE'}
              {...register('cert_title')}
            />
            <p className="text-xs text-muted-foreground">One line per row on the certificate.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cert_description">Certificate description</Label>
            <Textarea
              id="cert_description"
              rows={3}
              className="resize-y border-border/80 bg-background"
              placeholder="Awarded for successfully completing…"
              {...register('cert_description')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cert_tags_text">Skill tags</Label>
            <Textarea
              id="cert_tags_text"
              rows={5}
              className="resize-y border-border/80 bg-background font-mono text-sm"
              placeholder={'Prompt Engineering\nAI Automation\nAI Research'}
              {...register('cert_tags_text')}
            />
            <p className="text-xs text-muted-foreground">One tag per line, up to 8 tags.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-border/80"
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="h-4 w-4" />
            Preview certificate
          </Button>
        </div>
      </section>

      <CertificatePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        draft={previewDraft}
      />

      <div className="sticky bottom-0 -mx-6 flex flex-wrap justify-end gap-2 border-t border-border/60 bg-card/95 px-6 py-4 backdrop-blur">
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
