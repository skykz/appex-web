import { useRef, useState, type ChangeEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { FileUp, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { coursesApi, type ImportedModuleDraft } from './api'
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

const MAX_ARCHIVE_BYTES = 12 * 1024 * 1024

interface ModuleImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerated: (draft: ImportedModuleDraft) => Promise<void>
}

/** Imports a ZIP whose file name becomes the module name and whose DOCX files become lessons. */
export function ModuleImportDialog({ open, onOpenChange, onGenerated }: ModuleImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  const generate = useMutation({
    mutationFn: async (file: File) => {
      const draft = await coursesApi.generateModuleFromArchive({
        fileName: file.name,
        contentType: file.type || 'application/zip',
        dataBase64: await readFileAsBase64(file),
      })
      await onGenerated(draft)
      return draft
    },
    onSuccess: (draft) => {
      toast.success(`Created hidden module “${draft.title}” with ${draft.lessons.length} lesson drafts.`)
      setFileName(null)
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not import the module.')
    },
  })

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast.error('Choose a ZIP file.')
      return
    }
    if (file.size > MAX_ARCHIVE_BYTES) {
      toast.error('The ZIP must be 12 MB or smaller.')
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
          <DialogTitle>Import module from ZIP</DialogTitle>
          <DialogDescription>
            The ZIP name becomes a hidden module. Each DOCX inside becomes a hidden lesson for review.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <input ref={fileInputRef} type="file" accept=".zip,application/zip" className="sr-only" onChange={selectFile} />
          <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 p-4 text-sm">
            <p className="font-medium">Supported: ZIP up to 12 MB with up to 10 DOCX files</p>
            <p className="mt-1 text-muted-foreground">
              Put lesson files in the order you want, for example <code>01-intro.docx</code>, <code>02-practice.docx</code>.
            </p>
            {fileName ? <p className="mt-3 truncate text-xs text-muted-foreground">{fileName}</p> : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={close} disabled={generate.isPending}>Cancel</Button>
            <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={generate.isPending}>
              {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
              {generate.isPending ? 'Creating module…' : 'Choose ZIP'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
