import { useMemo, useState } from 'react'
import { MessageCircle, Sparkles, X } from 'lucide-react'
import { cn } from '@shared/lib'
import { ApiError } from '@shared/api/http-client'
import { Button, PlatformLoader } from '@shared/ui'
import {
  ChatInput,
  ChatMessageList,
  chatApi,
  type AIModel,
  type ChatMessage,
} from '@features/ai-chat'
import type { LessonBlock } from './lesson-types'

interface LessonAssistantWidgetProps {
  lessonLabel: string
  stepIndex: number
  stepCount: number
  blocks: LessonBlock[]
}

/**
 * Converts learner-visible lesson blocks into compact text context for the AI helper.
 */
function blockContext(block: LessonBlock): string | null {
  switch (block.type) {
    case 'heading':
    case 'text':
    case 'bold-text':
      return block.content
    case 'callout':
      return `${block.title ? `${block.title}: ` : ''}${block.content}`
    case 'quiz':
    case 'quiz-single':
    case 'quiz-multi':
      return `Quiz question: ${block.question}`
    case 'submission':
      return `Submission task: ${block.prompt}`
    case 'video':
      return block.title ? `Video: ${block.title}` : null
    case 'file':
      return `Resource: ${block.label}${block.description ? ` - ${block.description}` : ''}`
    case 'list':
      return block.items.join('\n')
    case 'user-message':
      return `${block.name}: ${block.text}`
    case 'mentor-message':
      return `Mentor: ${block.text}`
    case 'image':
      return block.alt ? `Image: ${block.alt}` : null
    default:
      return null
  }
}

/**
 * Builds a short prompt prefix so lesson questions are answered with the current step in mind.
 */
function buildLessonPrompt({
  lessonLabel,
  stepIndex,
  stepCount,
  blocks,
  question,
}: LessonAssistantWidgetProps & { question: string }): string {
  const context = blocks
    .map(blockContext)
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 1800)

  return [
    'You are a helpful lesson assistant inside AppEx.',
    'Answer the learner question clearly and briefly. Use the lesson context when relevant, but do not invent facts if the context is not enough.',
    `Lesson: ${lessonLabel}`,
    `Current step: ${stepIndex + 1} of ${stepCount}`,
    context ? `Current step content:\n${context}` : null,
    `Learner question:\n${question}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

/**
 * Floating in-lesson AI helper for quick questions without leaving the lesson flow.
 */
export function LessonAssistantWidget(props: LessonAssistantWidgetProps) {
  const [open, setOpen] = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const intro = useMemo(
    () => `Ask about this lesson, examples, or what to do on step ${props.stepIndex + 1}.`,
    [props.stepIndex]
  )

  /**
   * Sends the learner question to the existing AI chat endpoint with hidden lesson context.
   */
  async function handleSend(question: string, model: AIModel) {
    const userMessage: ChatMessage = {
      id: `lesson-user-${Date.now()}`,
      role: 'user',
      content: question,
    }

    setError(null)
    setSending(true)
    setMessages((current) => [...current, userMessage])

    try {
      const response = await chatApi.sendMessage({
        sessionId,
        modelId: model.id,
        content: buildLessonPrompt({ ...props, question }),
      })
      setSessionId(response.sessionId)
      setMessages((current) => [
        ...current,
        {
          id: response.assistantMessage.id,
          role: 'assistant',
          content: response.assistantMessage.content,
        },
      ])
    } catch (err) {
      setMessages((current) => current.filter((msg) => msg.id !== userMessage.id))
      setError(err instanceof ApiError ? err.message : 'Could not ask assistant.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-16 right-4 z-20 flex size-12 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 sm:bottom-20 sm:right-6',
          'bg-zinc-950 text-white ring-2 ring-primary/40 hover:ring-primary',
          open && 'pointer-events-none scale-75 opacity-0'
        )}
        aria-label="Open lesson assistant"
      >
        <MessageCircle className="size-6" aria-hidden />
      </button>

      {open ? (
        <div className="fixed bottom-16 right-4 z-30 flex h-[min(560px,calc(100dvh-7rem))] w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden rounded-2xl border border-border/80 bg-background shadow-2xl sm:bottom-20 sm:right-6 sm:w-[420px]">
          <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Lesson assistant</p>
              <p className="truncate text-xs text-muted-foreground">{intro}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close lesson assistant"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-muted/30 px-4 py-5 text-sm leading-relaxed text-muted-foreground">
                Ask a question about this step. The assistant will use the current lesson
                context in the answer.
              </div>
            ) : (
              <ChatMessageList messages={messages} />
            )}
            {sending ? (
              <div className="mt-4 flex justify-center py-2" aria-label="Assistant thinking">
                <PlatformLoader variant="compact" />
              </div>
            ) : null}
            {error ? (
              <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <div className="border-t border-border/70 bg-muted/20 p-3">
            <ChatInput onSend={handleSend} disabled={sending} />
            <div className="mt-2 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground"
                onClick={() => {
                  setMessages([])
                  setSessionId(undefined)
                  setError(null)
                }}
                disabled={sending || messages.length === 0}
              >
                Clear chat
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
