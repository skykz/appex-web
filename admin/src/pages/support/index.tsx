import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MailOpen } from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchContactMessages,
  patchContactRead,
  type ContactMessageRow,
} from '@features/inbox/api'
import { Button } from '@shared/ui/button'
import { Card, CardContent } from '@shared/ui/card'
import { PageHeader } from '@shared/ui/page-header'
import { Skeleton } from '@shared/ui/skeleton'
import { ApiError } from '@shared/api/http-client'

const PAGE = 20

/**
 * Admin inbox for user-submitted contact messages and categorized feedback.
 */
export function SupportInboxPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [unreadOnly, setUnreadOnly] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'contact-messages', page, unreadOnly],
    queryFn: () =>
      fetchContactMessages({ page, limit: PAGE, unreadOnly: unreadOnly || undefined }),
  })

  const markRead = useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) => patchContactRead(id, read),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'contact-messages'] })
    },
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.message : 'Failed'
      toast.error(msg)
    },
  })

  const items = data?.items ?? []
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE))

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Support"
        title="Inbox"
        description="Messages from Settings → Contact us (feedback, bugs, billing)."
      />

      <Card className="border-border/70 shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => {
                setUnreadOnly(e.target.checked)
                setPage(1)
              }}
            />
            Unread only
          </label>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No messages.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((m) => (
            <MessageCard
              key={m.id}
              m={m}
              onMarkRead={() => markRead.mutate({ id: m.id, read: !m.read_at })}
            />
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {page} / {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Single inbox row with expandable body and read/unread control.
 */
function MessageCard({
  m,
  onMarkRead,
}: {
  m: ContactMessageRow
  onMarkRead: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <li className="rounded-xl border border-border/70 bg-card shadow-sm">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {!m.read_at ? (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                New
              </span>
            ) : null}
            <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
              {m.category}
            </span>
          </div>
          <p className="mt-1 font-medium">{m.subject}</p>
          <p className="text-xs text-muted-foreground">
            {m.name || '—'} · {m.email}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(m.created_at).toLocaleString()}
          </p>
        </div>
        <MailOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
      {open ? (
        <div className="border-t border-border/60 px-4 py-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.message}</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onMarkRead}>
            {m.read_at ? 'Mark unread' : 'Mark read'}
          </Button>
        </div>
      ) : null}
    </li>
  )
}
