/**
 * LessonAssistantWidget — floating Lexi mentor bubble that lives over the lesson.
 *
 * Behaviour:
 *  - Streams Claude responses in real-time via SSE (no spinner-wait).
 *  - Sends lesson context (label, step, content) to personalise answers.
 *  - Persists the thread ID across steps so history is maintained per-session.
 *  - Lets learners rate assistant replies (👍/👎) without leaving the lesson.
 *  - No model picker — Lexi always uses Claude (decided on the backend).
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, ThumbsUp, ThumbsDown, Send } from 'lucide-react'
import { cn } from '@shared/lib'
import { Textarea } from '@shared/ui'
import { useAuthStore } from '@entities/user'
import { LiveChatBubble, LexiMark } from './lesson-chat-message-blocks'
import {
  streamLexiMessage,
  submitLexiFeedback,
  type LexiLessonCtx,
} from '@features/ai-chat/lexi-api'
import type { LessonBlock } from './lesson-types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface LessonAssistantWidgetProps {
  lessonLabel: string
  moduleLabel?: string
  stepIndex: number
  stepCount: number
  blocks: LessonBlock[]
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  /** Feedback for assistant messages: 1 = 👍, -1 = 👎, null = none yet. */
  feedback?: 1 | -1 | null
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

/**
 * Lexi avatar — the same friendly face mark used in chat bubbles, with a ring/shadow
 * so it reads well as a standalone mark (trigger bubble, panel header, empty state).
 */
function LexiAvatar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'shrink-0 overflow-hidden rounded-full shadow-sm ring-2 ring-primary/30',
        className
      )}
      role="img"
      aria-label="Lexi AI learning mentor"
    >
      <LexiMark />
    </span>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Converts lesson blocks into a compact text summary for Lexi's grounding context.
 */
function extractContentSummary(blocks: LessonBlock[]): string {
  const parts: string[] = []

  for (const block of blocks) {
    let text: string | null = null
    switch (block.type) {
      case 'heading':
      case 'text':
      case 'bold-text':
        text = block.content
        break
      case 'callout':
        text = `${block.title ? `${block.title}: ` : ''}${block.content}`
        break
      case 'quiz':
      case 'quiz-single':
      case 'quiz-multi':
        text = `Quiz: ${block.question}`
        break
      case 'submission':
        text = `Task: ${block.prompt}`
        break
      case 'list':
        text = block.items.join('\n')
        break
      case 'user-message':
        text = `${block.name}: ${block.text}`
        break
      case 'mentor-message':
        text = `Mentor: ${block.text}`
        break
      case 'video':
        text = block.title ? `Video: ${block.title}` : null
        break
      case 'file':
        text = `Resource: ${block.label}${block.description ? ` — ${block.description}` : ''}`
        break
      case 'link':
        text = `Link: ${block.label} (${block.url})${block.description ? ` — ${block.description}` : ''}`
        break
      case 'image':
        text = block.alt ? `Image: ${block.alt}` : null
        break
      default:
        break
    }
    if (text) parts.push(text)
  }

  return parts.join('\n\n').slice(0, 1800)
}

// ─── Empty state copy ─────────────────────────────────────────────────────────

const LEXI_SUGGESTIONS = [
  { short: 'Explain this simply', full: 'Explain this lesson simply, with an example.' },
  { short: 'Improve my prompt', full: 'Help me improve my prompt or submission for this step.' },
  { short: 'Make it about me', full: 'Connect this lesson to my background — a service I could actually sell.' },
  { short: "What's my next step?", full: 'Based on this lesson, what should I do next to keep momentum?' },
] as const

/**
 * First-open state: a short welcome + tappable suggestion chips so the learner
 * can start with one tap instead of reading a wall of bullet points.
 */
function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-2 text-center">
      <LexiAvatar className="size-12" />
      <p className="mt-3 text-sm font-semibold text-foreground">
        Ask me anything about this lesson
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        I coach, you build — that's how you become an AI Operator.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {LEXI_SUGGESTIONS.map((s) => (
          <button
            key={s.short}
            type="button"
            onClick={() => onPick(s.full)}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/[0.05] active:scale-95"
          >
            {s.short}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1" aria-label="Lexi is typing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-muted-foreground/50"
          style={{ animation: `lexi-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
      <style>{`
        @keyframes lexi-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────

/**
 * Renders a single chat bubble with optional 👍/👎 feedback for assistant messages.
 */
function MessageBubble({
  message,
  userLabel,
  onFeedback,
}: {
  message: Message
  userLabel: string
  onFeedback?: (id: string, value: 1 | -1) => void
}) {
  const isUser = message.role === 'user'

  return (
    <LiveChatBubble
      role={isUser ? 'user' : 'assistant'}
      label={isUser ? userLabel : 'Lexi'}
      footer={
        !isUser && message.content && onFeedback ? (
          <div className="flex gap-1 px-1">
            <button
              type="button"
              onClick={() => onFeedback(message.id, 1)}
              aria-label="Helpful"
              className={cn(
                'rounded p-1 text-muted-foreground/50 transition-colors hover:text-green-500',
                message.feedback === 1 && 'text-green-500'
              )}
            >
              <ThumbsUp className="size-3" />
            </button>
            <button
              type="button"
              onClick={() => onFeedback(message.id, -1)}
              aria-label="Not helpful"
              className={cn(
                'rounded p-1 text-muted-foreground/50 transition-colors hover:text-red-400',
                message.feedback === -1 && 'text-red-400'
              )}
            >
              <ThumbsDown className="size-3" />
            </button>
          </div>
        ) : undefined
      }
    >
      {message.content}
    </LiveChatBubble>
  )
}

// ─── Main widget ──────────────────────────────────────────────────────────────

/**
 * Floating in-lesson Lexi chat widget. Streams Claude responses in real-time.
 */
export function LessonAssistantWidget(props: LessonAssistantWidgetProps) {
  const { lessonLabel, moduleLabel, stepIndex, stepCount, blocks } = props
  const userName = useAuthStore((state) => state.user?.name?.trim())
  const userLabel = userName || 'You'

  const [open, setOpen] = useState(false)
  const [threadId, setThreadId] = useState<string | undefined>()
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [inputText, setInputText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  /** Auto-scroll to bottom on new content. */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingContent])

  /** Auto-resize textarea on content change. */
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [inputText])

  /**
   * Records 👍/👎 feedback on an assistant message locally and on the server.
   */
  const handleFeedback = useCallback((messageId: string, value: 1 | -1) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, feedback: value } : m))
    )
    submitLexiFeedback(messageId, value).catch(() => {
      /* fire-and-forget; don't surface feedback errors to learner */
    })
  }, [])

  /**
   * Sends the learner's question to Lexi and streams the response into the UI.
   */
  async function handleSend(preset?: string) {
    const question = (preset ?? inputText).trim()
    if (!question || streaming) return

    const lessonCtx: LexiLessonCtx = {
      lessonLabel,
      moduleLabel,
      stepIndex,
      stepCount,
      contentSummary: extractContentSummary(blocks),
    }

    // Optimistic user message (will get a real ID from the server)
    const tempId = `tmp-${Date.now()}`
    setMessages((prev) => [...prev, { id: tempId, role: 'user', content: question }])
    setInputText('')
    setError(null)
    setStreaming(true)
    setStreamingContent('')

    let assistantContent = ''
    let assistantMessageId: string | undefined

    await streamLexiMessage(
      { threadId, content: question, lessonCtx },
      {
        onThread(id, userMessageId) {
          setThreadId(id)
          // Replace temp ID with the real server-assigned user-message ID
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, id: userMessageId } : m))
          )
        },
        onDelta(chunk) {
          assistantContent += chunk
          setStreamingContent(assistantContent)
        },
        onDone(messageId) {
          assistantMessageId = messageId
        },
        onError(message) {
          setError(message)
          // Remove the optimistic user message on error
          setMessages((prev) => prev.filter((m) => m.id !== tempId))
        },
      }
    )

    setStreaming(false)

    if (assistantContent) {
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId ?? `ai-${Date.now()}`,
          role: 'assistant',
          content: assistantContent,
          feedback: null,
        },
      ])
    }
    setStreamingContent('')

    // Re-focus input after response
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  /**
   * Enter submits; Shift+Enter inserts a newline.
   */
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || e.shiftKey) return
    e.preventDefault()
    handleSend()
  }

  const canSend = Boolean(inputText.trim()) && !streaming

  return (
    <>
      {/* Floating trigger bubble */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'group fixed bottom-16 right-4 z-20 flex items-center gap-2 rounded-full border border-border/60 bg-background/90 p-1.5 shadow-lg backdrop-blur transition-all hover:shadow-xl active:scale-95 max-[380px]:gap-0 sm:bottom-20 sm:right-6 sm:pr-3.5',
          open && 'pointer-events-none scale-75 opacity-0'
        )}
        aria-label="Open Lexi AI learning mentor"
      >
        <LexiAvatar className="size-9 transition-transform group-hover:scale-105" />
        <div className="pr-1.5 text-left max-[380px]:hidden sm:pr-0">
          <p className="text-sm font-semibold leading-none text-foreground">Ask Lexi</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">AI learning mentor</p>
        </div>
      </button>

      {/* Chat panel */}
      {open ? (
        <div className="fixed bottom-16 right-4 z-30 flex h-[min(480px,calc(100dvh-8rem))] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-border/80 bg-background shadow-2xl sm:bottom-20 sm:right-6 sm:w-[360px]">
          {/* Header */}
          <div className="flex items-center gap-2.5 border-b border-border/70 px-3.5 py-2.5">
            <LexiAvatar className="size-8" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">Lexi</p>
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
                AI mentor · always here
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close lesson assistant"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          {/* Message list */}
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3.5">
            {messages.length === 0 && !streaming ? (
              <EmptyState onPick={(q) => handleSend(q)} />
            ) : (
              <div className="flex flex-col gap-5">
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    userLabel={userLabel}
                    onFeedback={msg.role === 'assistant' ? handleFeedback : undefined}
                  />
                ))}

                {/* Streaming assistant message */}
                {streaming ? (
                  <LiveChatBubble role="assistant" label="Lexi">
                    {streamingContent ? (
                      streamingContent
                    ) : (
                      <TypingDots />
                    )}
                  </LiveChatBubble>
                ) : null}
              </div>
            )}

            {error ? (
              <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          {/* Input area */}
          <div className="border-t border-border/70 bg-muted/20 p-2.5">
            <div className="flex items-end gap-2 rounded-2xl border bg-card py-1.5 pl-3 pr-1.5 shadow-sm focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15">
              <Textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about this lesson…"
                disabled={streaming}
                rows={1}
                className="max-h-[120px] min-h-[28px] w-full resize-none self-center border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!canSend}
                aria-label="Send message"
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full transition-all duration-200',
                  canSend
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-90'
                    : 'cursor-not-allowed bg-muted text-muted-foreground opacity-50'
                )}
              >
                <Send className="size-4" />
              </button>
            </div>

            <div className="mt-1.5 flex items-center justify-between px-1">
              <p className="text-[11px] text-muted-foreground/50">Powered by Claude</p>
              <button
                type="button"
                onClick={() => {
                  setMessages([])
                  setThreadId(undefined)
                  setError(null)
                  setStreamingContent('')
                }}
                disabled={streaming || messages.length === 0}
                className="text-[11px] font-medium text-muted-foreground/60 transition-colors hover:text-muted-foreground disabled:opacity-40"
              >
                Clear chat
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
