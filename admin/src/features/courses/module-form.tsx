import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { coursesApi, type Module } from './api'
import { Button } from '@shared/ui/button'
import { Input } from '@shared/ui/input'
import { Label } from '@shared/ui/label'
import { ApiError } from '@shared/api/http-client'

const schema = z.object({
  title: z.string().min(2).max(120),
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
    resolver: zodResolver(schema),
    defaultValues: { title: initial?.title ?? '' },
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
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" placeholder="Getting started" {...register('title')} />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
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
