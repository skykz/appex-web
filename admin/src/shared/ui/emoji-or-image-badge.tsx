import { isLikelyImageBadgeUrl } from '@appex/lesson-schema'
import { cn } from '@shared/lib'

interface EmojiOrImageBadgeProps {
  value: string
  /** Outer frame: size, rounding, background (applies to both emoji and image). */
  frameClassName?: string
  /** Extra classes for the emoji text span. */
  emojiClassName?: string
}

/**
 * Renders a catalog/lesson “emoji” field as either text/emoji or a thumbnail when the value is a URL or data URL.
 */
export function EmojiOrImageBadge({ value, frameClassName, emojiClassName }: EmojiOrImageBadgeProps) {
  const v = (value || '').trim()
  if (!v) return null
  const box = cn(
    'flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted shadow-inner',
    frameClassName ?? 'h-11 w-11'
  )
  if (isLikelyImageBadgeUrl(v)) {
    return (
      <div className={box}>
        <img src={v} alt="" className="h-full w-full object-cover" loading="lazy" />
      </div>
    )
  }
  return (
    <div className={cn(box, 'text-xl', emojiClassName)} aria-hidden>
      {v}
    </div>
  )
}
