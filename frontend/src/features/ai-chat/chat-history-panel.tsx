import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@shared/lib'
import { mockChatHistory } from './mock-data'

interface ChatHistoryPanelProps {
  open: boolean
  onClose: () => void
}

export function ChatHistoryPanel({ open, onClose }: ChatHistoryPanelProps) {
  const [tab, setTab] = useState<'chat' | 'assistants'>('chat')

  if (!open) return null

  const filtered = mockChatHistory.filter((item) =>
    tab === 'chat' ? item.type === 'chat' : item.type === 'assistant'
  )

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-4 top-16 z-50 w-80 rounded-2xl border bg-background shadow-xl animate-in fade-in slide-in-from-right-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-3">
          <h2 className="text-lg font-bold">History</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-muted active:scale-95"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="mx-4 flex rounded-lg bg-muted/50 p-1">
          <button
            type="button"
            onClick={() => setTab('chat')}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              tab === 'chat'
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Chat
          </button>
          <button
            type="button"
            onClick={() => setTab('assistants')}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              tab === 'assistants'
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Assistants
          </button>
        </div>

        {/* History items */}
        <div className="max-h-96 overflow-y-auto p-4 pt-3">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No history yet
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted"
                >
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.date}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
