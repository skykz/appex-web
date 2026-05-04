import { useState, useCallback, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PenSquare, Sparkles, Clock, X } from 'lucide-react'
import { cn } from '@shared/lib'
import { ApiError } from '@shared/api/http-client'
import {
  ChatInput,
  ChatActionChips,
  ChatMessageList,
  ChatHistoryPanel,
  AIToolsOnboardingDialog,
  chatApi,
  type ChatMessage,
  type AIModel,
} from '@features/ai-chat'

/**
 * Main AI chat workspace: messages, credits, session history, regenerate, and errors.
 */
export default function AIChatPage() {
  const queryClient = useQueryClient()
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastSendModelRef = useRef<AIModel | null>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [credits, setCredits] = useState<number | null>(null)
  const [sessionId, setSessionId] = useState<string | undefined>()
  const [sessionModelId, setSessionModelId] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [regeneratingAssistantId, setRegeneratingAssistantId] = useState<
    string | null
  >(null)

  const { data: remoteModels = [] } = useQuery({
    queryKey: ['chat-models'],
    queryFn: () => chatApi.getModels(),
    staleTime: 5 * 60_000,
  })

  const hasMessages = messages.length > 0

  /**
   * Maps a backend model id to the picker row (name + id) for sends and regenerate.
   */
  const resolveModel = useCallback(
    (id: string): AIModel => {
      const hit = remoteModels.find((m) => m.id === id)
      if (hit) return hit
      return { id, name: id }
    },
    [remoteModels]
  )

  useEffect(() => {
    chatApi
      .getCredits()
      .then((data) => setCredits(data.balance))
      .catch(() => setCredits(null))
  }, [])

  /** Keeps the transcript scrolled to the latest bubble as messages stream in. */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, sending, regeneratingAssistantId])

  /**
   * Sends a user turn to `POST /chat/messages` and merges server ids into local state.
   */
  const handleSend = useCallback(
    async (text: string, model: AIModel) => {
      const tempUserMsg: ChatMessage = {
        id: `temp-user-${Date.now()}`,
        role: 'user',
        content: text,
      }
      setSendError(null)
      setMessages((prev) => [...prev, tempUserMsg])
      setInputText('')
      setSending(true)
      lastSendModelRef.current = model

      try {
        const response = await chatApi.sendMessage({
          sessionId,
          modelId: model.id,
          content: text,
        })

        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          {
            id: response.userMessage.id,
            role: 'user',
            content: response.userMessage.content,
          },
          {
            id: response.assistantMessage.id,
            role: 'assistant',
            content: response.assistantMessage.content,
          },
        ])
        setCredits(response.creditsRemaining)
        if (!sessionId) setSessionId(response.sessionId)
        void queryClient.invalidateQueries({ queryKey: ['chat-sessions'] })
      } catch (e) {
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id))
        setInputText(text)
        const msg =
          e instanceof ApiError ? e.message : 'Could not send message.'
        setSendError(msg)
      } finally {
        setSending(false)
      }
    },
    [sessionId, queryClient]
  )

  /**
   * Re-sends the user content that produced a given assistant row and swaps in the new reply.
   */
  const handleRegenerate = useCallback(
    async (assistantMessageId: string) => {
      const model = lastSendModelRef.current
      if (!model || !sessionId || sending || regeneratingAssistantId) return

      const idx = messages.findIndex((m) => m.id === assistantMessageId)
      if (idx < 0) return
      const priorUser = [...messages.slice(0, idx)]
        .reverse()
        .find((m) => m.role === 'user')
      if (!priorUser) return

      setSendError(null)
      setRegeneratingAssistantId(assistantMessageId)

      try {
        const response = await chatApi.sendMessage({
          sessionId,
          modelId: model.id,
          content: priorUser.content,
        })
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  id: response.assistantMessage.id,
                  role: 'assistant',
                  content: response.assistantMessage.content,
                }
              : m
          )
        )
        setCredits(response.creditsRemaining)
        void queryClient.invalidateQueries({ queryKey: ['chat-sessions'] })
      } catch (e) {
        const msg =
          e instanceof ApiError ? e.message : 'Could not regenerate reply.'
        setSendError(msg)
      } finally {
        setRegeneratingAssistantId(null)
      }
    },
    [
      messages,
      sessionId,
      sending,
      regeneratingAssistantId,
      queryClient,
    ]
  )

  /**
   * Inserts a starter phrase from quick chips into the composer.
   */
  function handleChipClick(label: string) {
    setInputText(label)
  }

  /**
   * Clears local transcript and starts a fresh session id on the next send.
   */
  function handleNewChat() {
    setMessages([])
    setSessionId(undefined)
    setSessionModelId(null)
    setInputText('')
    setSendError(null)
    lastSendModelRef.current = null
    chatApi
      .getCredits()
      .then((data) => setCredits(data.balance))
      .catch(() => {})
  }

  /**
   * Hydrates messages and model selection from `GET /chat/sessions/:id`.
   */
  async function handleSelectSession(id: string) {
    setSendError(null)
    try {
      const session = await chatApi.getSession(id)
      setSessionId(session.id)
      setSessionModelId(session.model_id ?? null)
      lastSendModelRef.current = resolveModel(session.model_id ?? 'chatgpt')
      setMessages(
        session.messages.map((m) => ({
          id: m.id,
          role: m.role as ChatMessage['role'],
          content: m.content,
        }))
      )
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : 'Could not open conversation.'
      setSendError(msg)
    }
  }

  /**
   * Resets the page when the active session row is deleted from history.
   */
  function handleSessionDeleted(deletedId: string) {
    if (deletedId === sessionId) handleNewChat()
  }

  return (
    <>
      <div className="relative flex min-h-dvh w-full flex-col">
        {sendError && (
          <div
            className="flex items-center justify-between gap-3 border-b border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
            role="alert"
          >
            <span className="min-w-0">{sendError}</span>
            <button
              type="button"
              onClick={() => setSendError(null)}
              className="shrink-0 rounded-md p-1 hover:bg-destructive/15"
              aria-label="Dismiss error"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

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
              {credits != null ? `${credits} credits` : '—'}
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
              aria-label="New chat"
            >
              <PenSquare className="size-4" />
            </button>
          </div>
        </div>

        {hasMessages ? (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="mx-auto w-full max-w-3xl">
                <ChatMessageList
                  messages={messages}
                  regeneratingAssistantId={regeneratingAssistantId}
                  onRegenerate={sessionId ? handleRegenerate : undefined}
                />
                {sending && (
                  <div
                    className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"
                    aria-live="polite"
                  >
                    <span
                      className="inline-flex size-2 animate-pulse rounded-full bg-primary"
                      aria-hidden
                    />
                    Thinking…
                  </div>
                )}
                <div ref={bottomRef} className="h-px w-full shrink-0" aria-hidden />
              </div>
            </div>

            <div className="border-t bg-background px-4 py-3">
              <div className="mx-auto w-full max-w-3xl">
                <ChatInput
                  onSend={handleSend}
                  initialText={inputText}
                  disabled={sending || Boolean(regeneratingAssistantId)}
                  preferredModelId={sessionModelId}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-8">
            <h2 className="text-2xl font-bold tracking-tight">
              How can I help you?
            </h2>

            <div className="w-full max-w-lg">
              <ChatInput
                onSend={handleSend}
                initialText={inputText}
                disabled={sending || Boolean(regeneratingAssistantId)}
                preferredModelId={sessionModelId}
              />
            </div>

            {sending && (
              <p
                className="text-sm text-muted-foreground"
                aria-live="polite"
              >
                Thinking…
              </p>
            )}

            <div className="w-full max-w-lg">
              <ChatActionChips onChipClick={handleChipClick} />
            </div>
          </div>
        )}
      </div>

      <ChatHistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelectSession={handleSelectSession}
        activeSessionId={sessionId ?? null}
        onSessionDeleted={handleSessionDeleted}
      />

      <AIToolsOnboardingDialog />
    </>
  )
}
