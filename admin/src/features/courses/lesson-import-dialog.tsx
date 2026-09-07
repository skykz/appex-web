import { useRef, useState, type ChangeEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { FileUp, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { coursesApi, type ImportedLessonDraft } from './api'
import { readFileAsBase64 } from '@shared/lib/read-file-as-base64'
import { ApiError } from '@shared/api/http-client'
import { Button } from '@shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@shared/ui/dialog'

const MAX_DOCX_BYTES = 12 * 1024 * 1024

interface LessonImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerated: (draft: ImportedLessonDraft) => void
}

/** Uploads a DOCX and opens its AI-generated lesson as an unsaved editor draft. */
export function LessonImportDialog({ open, onOpenChange, onGenerated }: LessonImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  const generate = useMutation({
    mutationFn: async (file: File) =>
      coursesApi.generateLessonFromDocument({
        fileName: file.name,
        contentType:
          file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        dataBase64: await readFileAsBase64(file),
      }),
    onSuccess: (draft) => {
      toast.success('Lesson draft generated. Review it before saving.')
      onGenerated(draft)
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not generate the lesson draft.')
    },
  })

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.docx')) {
      toast.error('Choose a DOCX file.')
      return
    }
    if (file.size > MAX_DOCX_BYTES) {
      toast.error('The DOCX must be 12 MB or smaller.')
      return
    }
    setFileName(file.name)
    generate.mutate(file)
  }

  function close() {
    if (generate.isPending) return
    setFileName(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import lesson from DOCX</DialogTitle>
          <DialogDescription>
            AI creates an unsaved, hidden lesson draft. Review every block before saving it for learners.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            onChange={selectFile}
          />
          <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 p-4 text-sm">
            <p className="font-medium">Supported: DOCX up to 12 MB</p>
            <p className="mt-1 text-muted-foreground">
              Text, links, prompts, quizzes, and embedded images become editable lesson blocks.
            </p>
            {fileName ? <p className="mt-3 truncate text-xs text-muted-foreground">{fileName}</p> : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={close} disabled={generate.isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={generate.isPending}>
              {generate.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileUp className="h-4 w-4" />
              )}
              {generate.isPending ? 'Generating draft…' : 'Choose DOCX'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
