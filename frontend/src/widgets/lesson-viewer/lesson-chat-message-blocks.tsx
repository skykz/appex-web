import type { ReactNode } from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@shared/lib'
import { Avatar, AvatarFallback } from '@shared/ui'

/**
 * Lexi's mark — a sparkle on the warm-orange brand gradient. Reads honestly as an
 * AI mentor (no fake face) and needs no image asset.
 */
function LexiMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'flex size-full items-center justify-center bg-linear-to-br from-orange-500 to-amber-500 text-white',
        className
      )}
      aria-hidden
    >
      <Sparkles className="size-1/2" strokeWidth={2.25} />
    </span>
  )
}

/** Gap between sender name and bubble; max width before text wraps. */
const CHAT_LABEL_GAP = 'gap-1.5'
/** Cap the bubble column so avatar (size-10) + gap-3 never pushes the row past the container at 360px. */
const CHAT_BUBBLE_MAX = 'max-w-[min(100%-3.25rem,34rem)]'

const chatBubbleShellClass =
  'w-fit break-words rounded-[1.125rem] px-4 py-3.5 text-[15px] leading-relaxed shadow-sm'

interface UserMessageBlockProps {
  name: string
  children: ReactNode
  className?: string
}

/**
 * Right-aligned learner chat bubble: name above the bubble, avatar beside it; bubble width follows text length.
 */
export function UserMessageBlock({ name, children, className }: UserMessageBlockProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className={cn('mt-7 flex justify-end first:mt-0', className)}>
      <div className="flex max-w-full items-end gap-3">
        <div
          className={cn(
            'flex w-fit flex-col items-end',
            CHAT_LABEL_GAP,
            CHAT_BUBBLE_MAX
          )}
        >
          <span className="text-xs font-medium leading-none text-muted-foreground">{name}</span>
          <div
            className={cn(
              chatBubbleShellClass,
              'max-w-full bg-primary text-primary-foreground'
            )}
          >
            {children}
          </div>
        </div>
        <Avatar className="size-10 shrink-0 ring-2 ring-background">
          <AvatarFallback className="bg-linear-to-br from-violet-400 to-fuchsia-500 text-sm font-semibold text-white">
            {initial}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  )
}

interface MentorMessageBlockProps {
  children: ReactNode
  mentorLabel?: string
  className?: string
}

/**
 * Left-aligned mentor chat bubble: name above the bubble, avatar beside it; bubble width follows text length.
 */
export function MentorMessageBlock({
  children,
  mentorLabel = 'Mentor',
  className,
}: MentorMessageBlockProps) {
  return (
    <div className={cn('mt-7 flex justify-start first:mt-0', className)}>
      <div className="flex max-w-full items-end gap-3">
        <Avatar className="size-10 shrink-0 ring-2 ring-background">
          <LexiMark />
        </Avatar>
        <div
          className={cn(
            'flex w-fit flex-col items-start',
            CHAT_LABEL_GAP,
            CHAT_BUBBLE_MAX
          )}
        >
          <span className="text-xs font-medium leading-none text-muted-foreground">{mentorLabel}</span>
          <div
            className={cn(
              chatBubbleShellClass,
              'max-w-full bg-muted text-foreground'
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

interface LiveChatBubbleProps {
  role: 'user' | 'assistant'
  label: string
  children: ReactNode
  footer?: ReactNode
}

/**
 * Single row for the floating Lexi chat panel — name above bubble, width follows text length.
 */
export function LiveChatBubble({ role, label, children, footer }: LiveChatBubbleProps) {
  const isUser = role === 'user'
  const initial = label.trim().charAt(0).toUpperCase() || '?'

  const avatar = (
    <Avatar className="size-9 shrink-0 ring-2 ring-background">
      {isUser ? (
        <AvatarFallback className="bg-linear-to-br from-violet-400 to-fuchsia-500 text-xs font-semibold text-white">
          {initial}
        </AvatarFallback>
      ) : (
        <LexiMark />
      )}
    </Avatar>
  )

  const bubbleColumn = (
    <div
      className={cn(
        'flex w-fit flex-col',
        CHAT_LABEL_GAP,
        CHAT_BUBBLE_MAX,
        isUser ? 'items-end' : 'items-start'
      )}
    >
      <span className="text-xs font-medium leading-none text-muted-foreground">{label}</span>
      <div className="flex w-fit max-w-full flex-col gap-1">
        <div
          className={cn(
            'w-fit max-w-full rounded-[1.125rem] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          )}
        >
          {children}
        </div>
        {footer}
      </div>
    </div>
  )

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('flex max-w-full items-end gap-3', isUser && 'flex-row-reverse')}>
        {avatar}
        {bubbleColumn}
      </div>
    </div>
  )
}
