import { useId, useRef, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'
import { readImageFileAsDataUrl } from '@shared/lib/read-image-file-as-data-url'
import { Label } from '@shared/ui/label'
import { Input } from '@shared/ui/input'
import { Button } from '@shared/ui/button'
import { EmojiOrImageBadge } from '@shared/ui/emoji-or-image-badge'
import { cn } from '@shared/lib'

interface MediaBadgeFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  onBlur: () => void
  error?: string
  helperText?: string
}

/**
 * Course/lesson badge editor: emoji text, image URL/path, or upload from device (stores as data URL).
 */
export function MediaBadgeField({
  label,
  value,
  onChange,
  onBlur,
  error,
  helperText,
}: MediaBadgeFieldProps) {
  const id = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)

  /**
   * Inlines a picked raster file into the same string field the API already persists as `emoji`.
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
    <div className="space-y-2">
      <Label htmlFor={`${id}-badge-url`}>{label}</Label>
      <div className="flex flex-wrap items-start gap-3">
        <EmojiOrImageBadge value={value} frameClassName="h-14 w-14 text-2xl" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Input
            id={`${id}-badge-url`}
            placeholder="Emoji (e.g. 📘) or image URL / path…"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            className={cn('font-mono text-sm', error && 'border-destructive')}
          />
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              className="sr-only"
              onChange={onPickFile}
            />
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" aria-hidden />
              Upload image
            </Button>
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => onChange('📘')}>
              Reset to default
            </Button>
          </div>
          {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
      </div>
    </div>
  )
}
