/**
 * Lexi frontend API — thin client for the in-course AI mentor endpoints.
 *
 * The streaming call uses raw fetch + ReadableStream so we get incremental
 * text deltas instead of waiting for the full response (same UX as ChatGPT).
 * The token is read directly from localStorage (same key as httpClient uses).
 */

import { config } from '@shared/config'

const TOKEN_KEY = 'appex_access_token'

/** Lesson/step context forwarded to the backend for grounding Lexi's answers. */
export interface LexiLessonCtx {
  lessonLabel: string
  moduleLabel?: string
  stepIndex: number
  stepCount: number
  /** Trimmed lesson content sent as grounding context (max ~1800 chars). */
  contentSummary?: string
  /** Learner background from the onboarding quiz (optional). */
  learnerBackground?: string
}

export interface LexiThread {
  id: string
  created_at: string
}

export interface LexiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  feedback: 1 | -1 | null
  created_at: string
}

/** Callbacks fired during a streaming turn. */
export interface LexiStreamCallbacks {
  /** Fires once with the thread ID and the saved user-message ID. */
  onThread?: (threadId: string, userMessageId: string) => void
  /** Fires for each incremental text chunk from Claude. */
  onDelta?: (text: string) => void
  /** Fires when the stream closes successfully with the saved assistant-message ID. */
  onDone?: (messageId: string) => void
  /** Fires on any error (API, network, cap reached). */
  onError?: (message: string) => void
}

export interface LexiStreamRequest {
  threadId?: string
  content: string
  lessonCtx: LexiLessonCtx
}

/**
 * Returns the stored access token for Authorization headers.
 */
function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

/**
 * Streams a Lexi mentor turn using Server-Sent Events.
 *
 * Fires callbacks as events arrive. Resolves when the stream ends.
 * Rejects only on network-level failures; API-level errors come through `onError`.
 */
export async function streamLexiMessage(
  request: LexiStreamRequest,
  callbacks: LexiStreamCallbacks
): Promise<void> {
  const token = getToken()
  const url = `${config.apiUrl}/lexi/stream`

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(request),
    })
  } catch {
    callbacks.onError?.('Network error — check your connection.')
    return
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body = (await response.json()) as Record<string, unknown>
      if (typeof body.error === 'string') message = body.error
      else if (typeof body.message === 'string') message = body.message
    } catch {
      /* keep default */
    }
    callbacks.onError?.(message)
    return
  }

  if (!response.body) {
    callbacks.onError?.('Streaming not supported by this browser.')
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    let done: boolean
    let value: Uint8Array | undefined
    try {
      ;({ done, value } = await reader.read())
    } catch {
      callbacks.onError?.('Stream read error.')
      return
    }

    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const raw = line.slice(6).trim()
      if (!raw) continue

      try {
        const event = JSON.parse(raw) as Record<string, unknown>
        if (event.type === 'thread') {
          callbacks.onThread?.(event.threadId as string, event.userMessageId as string)
        } else if (event.type === 'delta') {
          callbacks.onDelta?.(event.text as string)
        } else if (event.type === 'done') {
          callbacks.onDone?.(event.messageId as string)
        } else if (event.type === 'error') {
          callbacks.onError?.(event.message as string)
        }
      } catch {
        /* skip malformed events */
      }
    }
  }
}

/**
 * Gets or creates the learner's Lexi thread for a given course.
 * courseId is optional — pass it to scope the thread to the current course.
 */
export async function getLexiThread(courseId?: string): Promise<LexiThread> {
  const token = getToken()
  const params = courseId ? `?courseId=${encodeURIComponent(courseId)}` : ''
  const response = await fetch(`${config.apiUrl}/lexi/thread${params}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!response.ok) throw new Error('Failed to load Lexi thread.')
  return response.json() as Promise<LexiThread>
}

/**
 * Loads all messages for a thread (used when re-opening the widget mid-session).
 */
export async function getLexiMessages(threadId: string): Promise<LexiMessage[]> {
  const token = getToken()
  const response = await fetch(`${config.apiUrl}/lexi/thread/${threadId}/messages`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!response.ok) throw new Error('Failed to load messages.')
  return response.json() as Promise<LexiMessage[]>
}

/**
 * Submits 👍 (1) or 👎 (-1) feedback on an assistant message.
 */
export async function submitLexiFeedback(
  messageId: string,
  feedback: 1 | -1
): Promise<void> {
  const token = getToken()
  await fetch(`${config.apiUrl}/lexi/messages/${messageId}/feedback`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ feedback }),
  })
}
