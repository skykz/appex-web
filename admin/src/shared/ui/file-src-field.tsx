import { useId, useRef, useState, useEffect, type ChangeEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FileText, Loader2, Upload } from 'lucide-react'
import { uploadsApi } from '@features/uploads/api'
import { readFileAsBase64 } from '@shared/lib/read-file-as-base64'
import { Label } from '@shared/ui/label'
import { Input } from '@shared/ui/input'
import { Textarea } from '@shared/ui/textarea'
import { Button } from '@shared/ui/button'

const MAX_BYTES = 20 * 1024 * 1024

interface FileSrcFieldProps {
  url: string
  label: string
  description?: string
  onUrlChange: (url: string) => void
  onLabelChange: (label: string) => void
  onDescriptionChange: (description: string) => void
  onBlur?: () => void
}

/**
 * Lesson download block editor: upload a file to storage (no manual URL entry).
 */
export function FileSrcField({
  url,
  label,
  description = '',
  onUrlChange,
  onLabelChange,
  onDescriptionChange,
  onBlur,
}: FileSrcFieldProps) {
  const rid = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState(() => guessFileName(url, label))

  useEffect(() => {
    setFileName(guessFileName(url, label))
  }, [url, label])

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > MAX_BYTES) {
        throw new Error('File is too large. Maximum size is 20 MB.')
      }
      const dataBase64 = await readFileAsBase64(file)
      return uploadsApi.uploadLessonFile({
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        size: file.size,
        dataBase64,
      })
    },
    onSuccess: (data) => {
      onUrlChange(data.url)
      setFileName(data.fileName)
      if (!label.trim()) onLabelChange(data.fileName)
      toast.success('File uploaded')
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    },
  })

  /** Sends the selected device file to the admin upload API. */
  async function onPickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    upload.mutate(file)
  }

  return (
    <div className="grid gap-3">
      <div className="space-y-2 rounded-lg border border-dashed border-border/80 bg-muted/20 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label className="text-xs text-muted-foreground">Download file</Label>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.csv,.json,.html,.htm,.png,.jpg,.jpeg,.webp,.gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/markdown,application/json,text/csv,text/html,image/png,image/jpeg,image/webp,image/gif"
              onChange={onPickFile}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={upload.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {upload.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Upload className="h-4 w-4" aria-hidden />
              )}
              {url ? 'Replace file' : 'Upload file'}
            </Button>
          </div>
        </div>
        {url ? (
          <div className="flex items-start gap-2 rounded-md border border-border/60 bg-background px-3 py-2 text-sm">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <p className="truncate font-medium">{fileName || label || 'Uploaded file'}</p>
              <p className="truncate text-xs text-muted-foreground">{url}</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            PDF, Word, Excel, TXT, Markdown, CSV, JSON, HTML, or image — up to 20 MB.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Button label</Label>
        <Input
          placeholder="e.g. Persona worksheet.pdf"
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          onBlur={onBlur}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Short description (optional)</Label>
        <Textarea
          id={`${rid}-file-desc`}
          rows={2}
          placeholder="Download this file and upload it to Claude…"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          onBlur={onBlur}
        />
      </div>
    </div>
  )
}

/**
 * Derives a display file name from the stored URL or learner-facing label.
 */
function guessFileName(url: string, label: string): string {
  if (label.trim()) return label.trim()
  if (!url.trim()) return ''
  try {
    const path = new URL(url).pathname
    const segment = path.split('/').filter(Boolean).pop()
    return segment ? decodeURIComponent(segment) : ''
  } catch {
    const segment = url.split('/').filter(Boolean).pop()
    return segment ? decodeURIComponent(segment) : ''
  }
}
