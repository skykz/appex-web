import { isLikelyImageBadgeUrl } from '@appex/lesson-schema'
import { cn } from '@shared/lib'

interface EmojiOrImageBadgeProps {
  value: string
  frameClassName?: string
  emojiClassName?: string
}

/**
 * Renders catalog/lesson badge field as emoji text or thumbnail (URL / data URL / path).
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
