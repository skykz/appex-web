import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { isLikelyImageBadgeUrl } from '@appex/lesson-schema'
import { cn } from '@shared/lib'

interface EmojiOrImageBadgeProps {
  value: string
  frameClassName?: string
  emojiClassName?: string
  imageClassName?: string
}

/**
 * Renders a catalog/lesson badge field as emoji text or a thumbnail (URL / data URL / path).
 * Image badges show a shimmer placeholder until they load, and a neutral icon fallback if
 * the image fails — so a slow or broken image never leaves an empty box.
 */
export function EmojiOrImageBadge({
  value,
  frameClassName,
  emojiClassName,
  imageClassName,
}: EmojiOrImageBadgeProps) {
  const v = (value || '').trim()
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  if (!v) return null

  const box = cn(
    'relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted shadow-inner',
    frameClassName ?? 'h-11 w-11'
  )

  if (isLikelyImageBadgeUrl(v)) {
    return (
      <div className={box}>
        {!loaded && !errored && (
          <span className="skeleton-shimmer absolute inset-0" aria-hidden />
        )}
        {errored ? (
          <ImageOff className="size-1/3 text-muted-foreground/50" aria-hidden />
        ) : (
          <img
            src={v}
            alt=""
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
            className={cn(
              'h-full w-full object-cover transition-opacity duration-300',
              imageClassName,
              loaded ? 'opacity-100' : 'opacity-0'
            )}
          />
        )}
      </div>
    )
  }

  return (
    <div className={cn(box, 'text-xl', emojiClassName)} aria-hidden>
      {v}
    </div>
  )
}
