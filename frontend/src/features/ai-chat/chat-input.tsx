import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SendHorizontal } from 'lucide-react'
import { cn } from '@shared/lib'
import { Textarea } from '@shared/ui'
import type { AIModel } from './types'
import { ModelSelector } from './model-selector'
import { chatApi } from './api'

interface ChatInputProps {
  /** Fires when the user sends; parent may await network work. */
  onSend?: (text: string, model: AIModel) => void | Promise<void>
  /** Seeds the composer (e.g. quick chips) while keeping local typing state. */
  initialText?: string
  /** Disables typing and send while a message is in flight. */
  disabled?: boolean
  /** When opening a saved session, selects this model id in the picker. */
  preferredModelId?: string | null
}

/**
 * Chat composer: auto-growing textarea, model picker from `GET /chat/models`, and send.
 */
export function ChatInput({
  onSend,
  initialText,
  disabled = false,
  preferredModelId,
}: ChatInputProps) {
  const [text, setText] = useState(initialText ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: remoteModels } = useQuery({
    queryKey: ['chat-models'],
    queryFn: () => chatApi.getModels(),
    staleTime: 5 * 60_000,
  })

  const models = remoteModels ?? []
  const modelsReady = models.length > 0
  const [model, setModel] = useState<AIModel | null>(null)

  /** Keep external chip text in sync with the controlled `initialText` prop. */
  useEffect(() => {
    if (initialText !== undefined) setText(initialText)
  }, [initialText])

  /** When the models list loads, ensure the selected row still exists. */
  useEffect(() => {
    if (!modelsReady) {
      setModel(null)
      return
    }
    setModel((prev) => models.find((m) => m.id === prev?.id) ?? models[0])
  }, [models, modelsReady])

  /** Prefer the session’s model when history is loaded or the user switches chats. */
  useEffect(() => {
    if (!preferredModelId) return
    const next = models.find((m) => m.id === preferredModelId)
    if (next) setModel(next)
  }, [preferredModelId, models])

  /** Grow the textarea with content up to a max height for long prompts. */
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = '0px'
    const max = 160
    el.style.height = `${Math.min(el.scrollHeight, max)}px`
  }, [text])

  /**
   * Validates input, delegates to the parent, and clears the field after submit intent.
   * A send is refused until a real model from `GET /chat/models` is selected.
   */
  function handleSend() {
    if (disabled || !model || !text.trim()) return
    onSend?.(text.trim(), model)
    setText('')
  }

  /**
   * Enter submits; Shift+Enter inserts a newline (standard chat composer behavior).
   */
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || e.shiftKey) return
    e.preventDefault()
    handleSend()
  }

  const canSend = Boolean(text.trim()) && !disabled && Boolean(model)

  return (
    <div className="w-full rounded-2xl border bg-card p-2 shadow-sm">
      <Textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything..."
        disabled={disabled}
        rows={1}
        className="max-h-[160px] min-h-[36px] resize-none border-0 bg-transparent px-1 py-1.5 text-sm shadow-none focus-visible:ring-0"
      />

      <div className="flex items-center justify-between pt-0.5">
        {model ? (
          <ModelSelector
            models={models}
            value={model}
            onChange={setModel}
            disabled={disabled}
          />
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
            Loading models…
          </span>
        )}

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            'flex size-9 items-center justify-center rounded-full transition-all duration-200',
            canSend
              ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-90'
              : 'cursor-not-allowed bg-muted text-muted-foreground opacity-50'
          )}
        >
          <SendHorizontal className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
