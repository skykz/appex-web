import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Trash2 } from 'lucide-react'
import { Skeleton } from '@shared/ui'
import { chatApi } from './api'
import { ApiError } from '@shared/api/http-client'
import { cn } from '@shared/lib'

interface ChatHistoryPanelProps {
  open: boolean
  onClose: () => void
  /** Loads a session into the active composer when the user picks a row */
  onSelectSession?: (sessionId: string) => void
  /** Current chat session id so the list can highlight the active row */
  activeSessionId?: string | null
  /** Called after a session is removed from the server (parent may reset UI) */
  onSessionDeleted?: (sessionId: string) => void
}

/**
 * Formats an ISO timestamp for compact list subtitles.
 */
function formatSessionDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

/**
 * Slide-over list of past chat sessions from `GET /chat/sessions` with delete actions.
 */
export function ChatHistoryPanel({
  open,
  onClose,
  onSelectSession,
  activeSessionId,
  onSessionDeleted,
}: ChatHistoryPanelProps) {
  const queryClient = useQueryClient()
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: sessions = [], isPending, isError, refetch } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: () => chatApi.listSessions(),
    enabled: open,
  })

  /**
   * Removes a session on the server and refreshes the sidebar query cache.
   */
  async function handleDeleteSession(sessionId: string, ev: React.MouseEvent) {
    ev.stopPropagation()
    setDeleteError(null)
    setDeletingId(sessionId)
    try {
      await chatApi.deleteSession(sessionId)
      await queryClient.invalidateQueries({ queryKey: ['chat-sessions'] })
      onSessionDeleted?.(sessionId)
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Could not delete.'
      setDeleteError(msg)
    } finally {
      setDeletingId(null)
    }
  }

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-[180] bg-black/60 backdrop-blur-md dark:bg-black/75"
        onClick={onClose}
        aria-hidden
      />

      <div className="fixed right-4 top-16 z-[190] w-[calc(100vw-2rem)] max-w-80 rounded-2xl border-2 border-border bg-popover text-popover-foreground shadow-2xl ring-1 ring-black/5 animate-in fade-in slide-in-from-right-4 duration-200 dark:ring-white/10">
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

        {deleteError && (
          <p className="px-4 pb-2 text-xs text-destructive">{deleteError}</p>
        )}

        <div className="max-h-96 overflow-y-auto px-4 pb-4">
          {isPending ? (
            <div className="flex flex-col gap-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl px-3 py-3">
                  <Skeleton className="h-4 w-3/4 rounded-md" />
                  <Skeleton className="mt-2 h-3 w-20 rounded-md" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <p>Could not load history.</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-2 font-medium text-primary hover:underline"
              >
                Retry
              </button>
            </div>
          ) : sessions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No conversations yet. Send a message to start one.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {sessions.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-stretch gap-1 rounded-xl transition-colors',
                    item.id === activeSessionId && 'bg-muted/80'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelectSession?.(item.id)
                      onClose()
                    }}
                    className="min-w-0 flex-1 rounded-l-xl px-3 py-3 text-left hover:bg-muted"
                  >
                    <p className="line-clamp-2 text-sm font-medium">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatSessionDate(item.created_at)}
                    </p>
                  </button>
                  <button
                    type="button"
                    aria-label="Delete conversation"
                    disabled={deletingId === item.id}
                    onClick={(ev) => void handleDeleteSession(item.id, ev)}
                    className="shrink-0 rounded-r-xl px-2.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
