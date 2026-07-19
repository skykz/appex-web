import { useEffect, useState } from 'react'
import { Copy, RefreshCw, Check } from 'lucide-react'
import { cn } from '@shared/lib'
import { PlatformLoader } from '@shared/ui'
import type { ChatMessage } from './types'
import { AssistantMessageBody } from './assistant-message-body'

/**
 * Kept for backward-compatible re-exports; main-chat feedback is not persisted,
 * so the like/dislike controls are intentionally not rendered.
 */
export type MessageFeedback = 'up' | 'down' | null

interface ChatMessageListProps {
  messages: ChatMessage[]
  /** Assistant message id currently being replaced by a regenerate call. */
  regeneratingAssistantId?: string | null
  /** Re-runs the prior user turn for the given assistant bubble. */
  onRegenerate?: (assistantMessageId: string) => void
}

/**
 * Renders the conversation with markdown for assistant rows and per-message actions.
 */
export function ChatMessageList({
  messages,
  regeneratingAssistantId,
  onRegenerate,
}: ChatMessageListProps) {
  return (
    <div className="flex flex-col gap-6">
      {messages.map((msg) =>
        msg.role === 'user' ? (
          <UserBubble key={msg.id} text={msg.content} />
        ) : (
          <AssistantMessage
            key={msg.id}
            message={msg}
            isRegenerating={regeneratingAssistantId === msg.id}
            onRegenerate={onRegenerate}
          />
        )
      )}
    </div>
  )
}

/**
 * Right-aligned bubble for learner prompts.
 */
function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[75%] rounded-2xl rounded-br-md bg-muted px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap">
        {text}
      </div>
    </div>
  )
}

interface AssistantMessageProps {
  message: ChatMessage
  isRegenerating: boolean
  onRegenerate?: (assistantMessageId: string) => void
}

/**
 * Assistant row: markdown body, copy, and optional regenerate.
 */
function AssistantMessage({
  message,
  isRegenerating,
  onRegenerate,
}: AssistantMessageProps) {
  const { id, content } = message
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(t)
  }, [copied])

  /**
   * Copies the rendered text source to the clipboard for reuse elsewhere.
   */
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
    } catch {
      /* clipboard may be denied */
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {isRegenerating ? (
        <div className="flex h-16 w-full max-w-xl items-center px-2" aria-busy aria-label="Regenerating reply">
          <PlatformLoader variant="compact" />
        </div>
      ) : (
        <AssistantMessageBody text={content} />
      )}
      <div className="flex flex-wrap items-center gap-1">
        <ActionIconButton label={copied ? 'Copied' : 'Copy'} onClick={() => void handleCopy()}>
          {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
        </ActionIconButton>
        {onRegenerate && (
          <ActionIconButton
            label="Regenerate"
            disabled={isRegenerating}
            onClick={() => onRegenerate(id)}
          >
            <RefreshCw className="size-4" />
          </ActionIconButton>
        )}
      </div>
    </div>
  )
}

interface ActionIconButtonProps {
  label: string
  onClick: () => void
  children: React.ReactNode
  pressed?: boolean
  disabled?: boolean
}

/**
 * Small icon-only control with hover/focus styles and optional pressed state.
 */
function ActionIconButton({
  label,
  onClick,
  children,
  pressed,
  disabled,
}: ActionIconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-lg p-1.5 transition-all',
        pressed
          ? 'bg-primary/15 text-primary'
          : 'text-muted-foreground/60 hover:bg-muted hover:text-foreground',
        'active:scale-90',
        disabled && 'pointer-events-none opacity-40'
      )}
    >
      {children}
    </button>
  )
}
