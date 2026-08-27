import { useId, useRef, useState, type ChangeEvent } from 'react'
import { Crop, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { readImageFileAsDataUrl } from '@shared/lib/read-image-file-as-data-url'
import { Label } from '@shared/ui/label'
import { Input } from '@shared/ui/input'
import { Button } from '@shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@shared/ui/dialog'
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

interface CropPosition {
  horizontal: number
  vertical: number
  zoom: number
}

const defaultCrop: CropPosition = { horizontal: 50, vertical: 50, zoom: 1 }
const coverAspectRatio = 16 / 10

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load image for cropping'))
    image.src = source
  })
}

async function createCroppedCover(source: string, crop: CropPosition): Promise<string> {
  const image = await loadImage(source)
  const width = 1600
  const height = Math.round(width / coverAspectRatio)
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * crop.zoom
  const drawnWidth = image.naturalWidth * scale
  const drawnHeight = image.naturalHeight * scale
  const offsetX = (width - drawnWidth) * (crop.horizontal / 100)
  const offsetY = (height - drawnHeight) * (crop.vertical / 100)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not prepare image crop')

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, offsetX, offsetY, drawnWidth, drawnHeight)
  return canvas.toDataURL('image/jpeg', 0.92)
}

/**
 * Course/lesson badge editor: emoji text, image URL/path, or an uploaded image cropped locally
 * before being stored in the existing badge field.
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
  const [cropSource, setCropSource] = useState<string | null>(null)
  const [crop, setCrop] = useState<CropPosition>(defaultCrop)
  const [isCropping, setIsCropping] = useState(false)

  async function onPickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const dataUrl = await readImageFileAsDataUrl(file)
      setCropSource(dataUrl)
      setCrop(defaultCrop)
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : 'Could not read image')
    }
  }

  async function applyCrop() {
    if (!cropSource) return
    setIsCropping(true)
    try {
      onChange(await createCroppedCover(cropSource, crop))
      setCropSource(null)
    } catch (cropError) {
      toast.error(cropError instanceof Error ? cropError.message : 'Could not crop image')
    } finally {
      setIsCropping(false)
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
            onChange={(event) => onChange(event.target.value)}
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
              Upload and crop
            </Button>
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => onChange('📘')}>
              Reset to default
            </Button>
          </div>
          {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
      </div>

      <Dialog open={cropSource !== null} onOpenChange={(open) => !open && setCropSource(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Crop course cover</DialogTitle>
            <DialogDescription>
              Choose the visible area. The saved cover uses the same 16:10 shape as learner course cards.
            </DialogDescription>
          </DialogHeader>

          {cropSource ? (
            <>
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border/70 bg-muted/30">
                <img
                  src={cropSource}
                  alt="Crop preview"
                  className="h-full w-full object-cover transition-transform duration-150"
                  style={{
                    objectPosition: `${crop.horizontal}% ${crop.vertical}%`,
                    transform: `scale(${crop.zoom})`,
                  }}
                />
                <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/70" />
              </div>

              <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
                <Crop className="size-4 text-primary" aria-hidden />
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <Label htmlFor={`${id}-zoom`}>Zoom</Label>
                    <span className="text-muted-foreground">{Math.round(crop.zoom * 100)}%</span>
                  </div>
                  <input
                    id={`${id}-zoom`}
                    type="range"
                    min="1"
                    max="2.5"
                    step="0.01"
                    value={crop.zoom}
                    onChange={(event) => setCrop((current) => ({ ...current, zoom: Number(event.target.value) }))}
                    className="w-full accent-primary"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`${id}-horizontal`} className="text-xs">Horizontal focus</Label>
                    <input
                      id={`${id}-horizontal`}
                      type="range"
                      min="0"
                      max="100"
                      value={crop.horizontal}
                      onChange={(event) => setCrop((current) => ({ ...current, horizontal: Number(event.target.value) }))}
                      className="w-full accent-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${id}-vertical`} className="text-xs">Vertical focus</Label>
                    <input
                      id={`${id}-vertical`}
                      type="range"
                      min="0"
                      max="100"
                      value={crop.vertical}
                      onChange={(event) => setCrop((current) => ({ ...current, vertical: Number(event.target.value) }))}
                      className="w-full accent-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCropSource(null)} disabled={isCropping}>
                  Cancel
                </Button>
                <Button type="button" onClick={applyCrop} disabled={isCropping}>
                  {isCropping ? 'Saving cover…' : 'Use cropped cover'}
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
