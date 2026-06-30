import type { ReactNode } from 'react'

const CHAT_LABEL_GAP = 'gap-1.5'
const CHAT_BUBBLE_MAX = 'max-w-[min(100%,34rem)]'

const chatBubbleShellClass =
  'w-fit break-words rounded-[1.125rem] px-4 py-3.5 text-[15px] leading-relaxed shadow-sm'

interface PreviewUserMessageBlockProps {
  name: string
  children: ReactNode
}

/**
 * Admin preview of a learner chat bubble — name above bubble, width follows text length.
 */
export function PreviewUserMessageBlock({ name, children }: PreviewUserMessageBlockProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="mt-7 flex justify-end first:mt-0">
      <div className="flex max-w-full items-end gap-3">
        <div className={`flex w-fit flex-col items-end ${CHAT_LABEL_GAP} ${CHAT_BUBBLE_MAX}`}>
          <span className="text-xs font-medium leading-none text-zinc-500">{name}</span>
          <div
            className={`${chatBubbleShellClass} ${CHAT_BUBBLE_MAX} bg-primary text-primary-foreground`}
          >
            {children}
          </div>
        </div>
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 text-sm font-semibold text-white ring-2 ring-white"
          aria-hidden
        >
          {initial}
        </div>
      </div>
    </div>
  )
}

interface PreviewMentorMessageBlockProps {
  children: ReactNode
}

/**
 * Admin preview of a mentor chat bubble — name above bubble, width follows text length.
 */
export function PreviewMentorMessageBlock({ children }: PreviewMentorMessageBlockProps) {
  return (
    <div className="mt-7 flex justify-start first:mt-0">
      <div className="flex max-w-full items-end gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-sm font-semibold text-white ring-2 ring-white"
          aria-hidden
        >
          L
        </div>
        <div className={`flex w-fit flex-col items-start ${CHAT_LABEL_GAP} ${CHAT_BUBBLE_MAX}`}>
          <span className="text-xs font-medium leading-none text-zinc-500">Mentor</span>
          <div
            className={`${chatBubbleShellClass} ${CHAT_BUBBLE_MAX} bg-zinc-100 text-zinc-900`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
