import { useState, useCallback, useEffect } from 'react'
import { PenSquare, Sparkles, Clock } from 'lucide-react'
import { cn } from '@shared/lib'
import {
  ChatInput,
  ChatActionChips,
  ChatMessageList,
  ChatHistoryPanel,
  AIToolsOnboardingDialog,
  type ChatMessage,
  type AIModel,
} from '@features/ai-chat'
import { chatApi } from '@features/ai-chat/api'

export default function AIChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [credits, setCredits] = useState(5)
  const [sessionId, setSessionId] = useState<string | undefined>()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)

  const hasMessages = messages.length > 0

  // Fetch initial credits
  useEffect(() => {
    chatApi.getCredits().then((data) => setCredits(data.balance)).catch(() => {})
  }, [])

  const handleSend = useCallback(
    async (text: string, model: AIModel) => {
      // Optimistic: show user message immediately
      const tempUserMsg: ChatMessage = {
        id: `temp-user-${Date.now()}`,
        role: 'user',
        content: text,
      }
      setMessages((prev) => [...prev, tempUserMsg])
      setInputText('')
      setSending(true)

      try {
        const response = await chatApi.sendMessage({
          sessionId,
          modelId: model.id,
          content: text,
        })

        // Replace temp message with real ones
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          { id: response.userMessage.id, role: 'user', content: response.userMessage.content },
          { id: response.assistantMessage.id, role: 'assistant', content: response.assistantMessage.content },
        ])
        setCredits(response.creditsRemaining)
        if (!sessionId) setSessionId(response.sessionId)
      } catch {
        // Remove temp message on failure
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id))
      } finally {
        setSending(false)
      }
    },
    [sessionId]
  )

  function handleChipClick(label: string) {
    setInputText(label)
  }

  function handleNewChat() {
    setMessages([])
    setSessionId(undefined)
    setInputText('')
    // Re-fetch credits (don't reset to 5)
    chatApi.getCredits().then((data) => setCredits(data.balance)).catch(() => {})
  }

  return (
    <>
      <div className="relative flex min-h-dvh w-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h1 className="text-lg font-semibold">AI chat</h1>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border border-primary/20 px-2.5 py-1',
                'text-xs font-semibold text-primary'
              )}
            >
              <Sparkles className="size-3" />
              {credits} credits
            </span>

            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
            >
              <Clock className="size-3.5" />
              <span className="hidden sm:inline">History</span>
            </button>

            <button
              type="button"
              onClick={handleNewChat}
              className="rounded-lg border p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
            >
              <PenSquare className="size-4" />
            </button>
          </div>
        </div>

        {hasMessages ? (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="mx-auto w-full max-w-3xl">
                <ChatMessageList messages={messages} />
              </div>
            </div>

            <div className="border-t bg-background px-4 py-3">
              <div className="mx-auto w-full max-w-3xl">
                <ChatInput onSend={handleSend} initialText={inputText} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-8">
            <h2 className="text-2xl font-bold tracking-tight">
              How can I help you?
            </h2>

            <div className="w-full max-w-lg">
              <ChatInput onSend={handleSend} initialText={inputText} />
            </div>

            <div className="w-full max-w-lg">
              <ChatActionChips onChipClick={handleChipClick} />
            </div>
          </div>
        )}

        {sending && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
            <div className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground animate-pulse">
              Thinking...
            </div>
          </div>
        )}
      </div>

      <ChatHistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />

      <AIToolsOnboardingDialog />
    </>
  )
}
