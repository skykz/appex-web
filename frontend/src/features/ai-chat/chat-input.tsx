import { useState, useEffect } from 'react'
import { SendHorizontal } from 'lucide-react'
import { cn } from '@shared/lib'
import { aiModels, type AIModel } from './mock-data'
import { ModelSelector } from './model-selector'

interface ChatInputProps {
  onSend?: (text: string, model: AIModel) => void | Promise<void>
  initialText?: string
}

export function ChatInput({ onSend, initialText }: ChatInputProps) {
  const [text, setText] = useState(initialText ?? '')
  const [model, setModel] = useState<AIModel>(aiModels[0])

  useEffect(() => {
    if (initialText !== undefined) setText(initialText)
  }, [initialText])

  function handleSend() {
    if (!text.trim()) return
    onSend?.(text.trim(), model)
    setText('')
  }

  return (
    <div className="w-full rounded-2xl border bg-card p-3 shadow-sm">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        placeholder="Ask anything..."
        className="w-full bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground/60"
      />

      <div className="flex items-center justify-between pt-1">
        <ModelSelector value={model} onChange={setModel} />

        {text.trim() && (
          <button
            type="button"
            onClick={handleSend}
            className={cn(
              'flex size-9 items-center justify-center rounded-full transition-all duration-200',
              'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-90'
            )}
          >
            <SendHorizontal className="size-4" />
          </button>
        )}
      </div>
    </div>
  )
}
