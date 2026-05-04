import { useId, useRef, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'
import { readImageFileAsDataUrl } from '@shared/lib/read-image-file-as-data-url'
import { Label } from '@shared/ui/label'
import { Input } from '@shared/ui/input'
import { Button } from '@shared/ui/button'
import { cn } from '@shared/lib'

interface ImageSrcFieldProps {
  id?: string
  label?: string
  value: string
  onChange: (v: string) => void
  onBlur: () => void
  urlPlaceholder?: string
}

/**
 * Image block editor: paste URL/path or upload from device (inlined data URL for lesson JSON).
 */
export function ImageSrcField({
  id: idProp,
  label = 'Image',
  value,
  onChange,
  onBlur,
  urlPlaceholder = 'Image URL (https://… or /path…)',
}: ImageSrcFieldProps) {
  const rid = useId()
  const id = idProp ?? `${rid}-img-src`
  const fileInputRef = useRef<HTMLInputElement>(null)

  /**
   * Writes a device image into the lesson `image` block `src` field.
   */
  async function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const dataUrl = await readImageFileAsDataUrl(file)
      onChange(dataUrl)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not read image')
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor={id} className="text-xs">
            {label}
          </Label>
          <Input id={id} placeholder={urlPlaceholder} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />
        </div>
        <div className="flex shrink-0 items-center pb-0.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
            className="sr-only"
            onChange={onPickFile}
          />
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" aria-hidden />
            From device
          </Button>
        </div>
      </div>
      {value.trim().startsWith('data:') ? (
        <p className="text-[11px] text-muted-foreground">Using an uploaded image (stored in lesson JSON). Prefer a URL for very large files.</p>
      ) : null}
      {value.trim() ? (
        <div className={cn('overflow-hidden rounded-lg border border-border/60 bg-muted/30', 'max-h-40')}>
          <img src={value} alt="" className="max-h-40 w-full object-contain" />
        </div>
      ) : null}
    </div>
  )
}
