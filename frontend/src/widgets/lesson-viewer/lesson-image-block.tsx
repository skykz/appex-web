import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@shared/ui'
import { cn } from '@shared/lib'

interface LessonImageBlockProps {
  src: string
  alt?: string
}

/**
 * Lesson image thumbnail that opens a fullscreen lightbox on click; image scales up to fill the viewport frame.
 */
export function LessonImageBlock({ src, alt = '' }: LessonImageBlockProps) {
  const [open, setOpen] = useState(false)

  if (!src.trim()) return null

  return (
    <>
      <div className="mt-4 overflow-hidden rounded-2xl bg-muted/40">
        <button
          type="button"
          className="block w-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          onClick={() => setOpen(true)}
          aria-label={alt ? `Enlarge image: ${alt}` : 'Enlarge image'}
        >
          <img src={src} alt={alt} className="h-auto w-full object-cover" loading="lazy" />
        </button>
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
