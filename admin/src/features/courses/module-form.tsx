import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { coursesApi, type Module } from './api'
import { Button } from '@shared/ui/button'
import { Checkbox } from '@shared/ui/checkbox'
import { Input } from '@shared/ui/input'
import { Label } from '@shared/ui/label'
import { ApiError } from '@shared/api/http-client'

const schema = z.object({
  title: z.string().min(2).max(120),
  is_visible: z.boolean().default(false),
})

type FormData = z.infer<typeof schema>

interface Props {
  courseId: number
  initial?: Module
  onDone: () => void
}

/**
 * Creates or renames a module; display order is controlled from the course page (move up/down).
 */
export function ModuleForm({ courseId, initial, onDone }: Props) {
  const qc = useQueryClient()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: { title: initial?.title ?? '', is_visible: initial?.is_visible ?? false },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      initial
        ? coursesApi.updateModule(initial.id, data)
        : coursesApi.createModule(courseId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'course', courseId] })
      toast.success(initial ? 'Module updated' : 'Module created')
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
        <Label htmlFor="title">Title</Label>
        <Input id="title" placeholder="Getting started" {...register('title')} />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
        <Checkbox className="mt-1" {...register('is_visible')} />
        <span>
          <span className="block font-medium">Visible to learners</span>
          <span className="block text-xs leading-relaxed text-muted-foreground">
            Hidden modules hide every lesson inside them.
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
