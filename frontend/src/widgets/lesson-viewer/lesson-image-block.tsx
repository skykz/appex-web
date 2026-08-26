import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@shared/ui'
import { cn } from '@shared/lib'

interface LessonImageBlockProps {
  src: string
  alt?: string
}

/**
 * Lesson image thumbnail that opens a fullscreen lightbox on click; image scales up to fill the viewport frame.
 * Shows a shimmer while the image loads and a neutral fallback if it fails, so a slow/broken image never leaves an empty box.
 */
export function LessonImageBlock({ src, alt = '' }: LessonImageBlockProps) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  if (!src.trim()) return null

  return (
    <>
      <div className="mt-4 overflow-hidden rounded-2xl border border-border/80 bg-muted/40 p-1.5 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
        {errored ? (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 text-muted-foreground/60">
            <ImageOff className="size-8" aria-hidden />
            <span className="text-xs">Image unavailable</span>
          </div>
        ) : (
          <button
            type="button"
            className={cn(
              'relative block w-full overflow-hidden rounded-xl cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              !loaded && 'min-h-40'
            )}
            onClick={() => setOpen(true)}
            aria-label={alt ? `Enlarge image: ${alt}` : 'Enlarge image'}
          >
            {!loaded && (
              <span className="skeleton-shimmer absolute inset-0" aria-hidden />
            )}
            <img
              src={src}
              alt={alt}
              loading="lazy"
              onLoad={() => setLoaded(true)}
              onError={() => setErrored(true)}
              className={cn(
                'h-auto w-full object-cover transition-opacity duration-300',
                loaded ? 'opacity-100' : 'opacity-0'
              )}
            />
          </button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            'flex items-center justify-center border-0 bg-transparent p-0 shadow-none ring-0',
            '!fixed !left-1/2 !top-1/2 !h-auto !w-max !max-w-[96vw] -translate-x-1/2 -translate-y-1/2',
            '[&>button]:right-2 [&>button]:top-2 [&>button]:z-10 [&>button]:rounded-full [&>button]:bg-black/65 [&>button]:p-2 [&>button]:text-white [&>button]:opacity-100 [&>button]:hover:bg-black/80'
          )}
          onClick={() => setOpen(false)}
        >
          <DialogTitle className="sr-only">{alt || 'Lesson image'}</DialogTitle>
          <div
            className="flex h-[min(90vh,1200px)] w-[min(96vw,1400px)] items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={src}
              alt={alt}
              className="h-full w-full cursor-zoom-out object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
