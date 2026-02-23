import { Copy, ThumbsUp, ThumbsDown, RefreshCw } from 'lucide-react'
import { cn } from '@shared/lib'
import type { ChatMessage } from './mock-data'

interface ChatMessageListProps {
  messages: ChatMessage[]
}

export function ChatMessageList({ messages }: ChatMessageListProps) {
  return (
    <div className="flex flex-col gap-6">
      {messages.map((msg) =>
        msg.role === 'user' ? (
          <UserBubble key={msg.id} text={msg.content} />
        ) : (
          <AssistantMessage key={msg.id} text={msg.content} />
        )
      )}
    </div>
  )
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[75%] rounded-2xl rounded-br-md bg-muted px-4 py-3 text-[15px] leading-relaxed">
        {text}
      </div>
    </div>
  )
}

function AssistantMessage({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-[15px] leading-relaxed">{text}</p>
      <div className="flex items-center gap-1">
        {[
          { Icon: Copy, label: 'Copy' },
          { Icon: ThumbsUp, label: 'Like' },
          { Icon: ThumbsDown, label: 'Dislike' },
          { Icon: RefreshCw, label: 'Regenerate' },
        ].map(({ Icon, label }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            className={cn(
              'rounded-lg p-1.5 text-muted-foreground/60 transition-all',
              'hover:bg-muted hover:text-foreground active:scale-90'
            )}
          >
            <Icon className="size-4" />
          </button>
        ))}
      </div>
    </div>
  )
}
