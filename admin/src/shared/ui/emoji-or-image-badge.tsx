import { isLikelyImageBadgeUrl } from '@appex/lesson-schema'
import { cn } from '@shared/lib'

interface EmojiOrImageBadgeProps {
  value: string
  /** Outer frame: size, rounding, background (applies to both emoji and image). */
  frameClassName?: string
  /** Extra classes for the emoji text span. */
  emojiClassName?: string
  /**
   * Meaningful description of what the badge represents (e.g. a course title).
   * Supply this only when the badge is NOT accompanied by adjacent visible text —
   * otherwise leave it undefined so the badge stays decorative and avoids
   * redundant screen-reader announcements.
   */
  label?: string
}

/**
 * Renders a catalog/lesson “emoji” field as either text/emoji or a thumbnail when the value is a URL or data URL.
 */
export function EmojiOrImageBadge({
  value,
  frameClassName,
  emojiClassName,
  label,
}: EmojiOrImageBadgeProps) {
  const v = (value || '').trim()
  if (!v) return null
  const box = cn(
    'flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted shadow-inner',
    frameClassName ?? 'h-11 w-11'
  )
  if (isLikelyImageBadgeUrl(v)) {
    return (
      <div className={box}>
        <img src={v} alt={label ?? ''} className="h-full w-full object-cover" loading="lazy" />
      </div>
    )
  }
  return (
    <div className={cn(box, 'text-xl', emojiClassName)} aria-hidden={!label} aria-label={label}>
      {v}
    </div>
  )
}
