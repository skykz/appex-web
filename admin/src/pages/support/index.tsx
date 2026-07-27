import { useDeferredValue, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MailOpen } from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchContactMessages,
  fetchContactUnreadCount,
  markAllContactMessagesRead,
  patchContactRead,
  type ContactMessageRow,
} from '@features/inbox/api'
import { Button } from '@shared/ui/button'
import { Card, CardContent } from '@shared/ui/card'
import { Checkbox } from '@shared/ui/checkbox'
import { ExpandableInboxCard } from '@shared/ui/expandable-inbox-card'
import { PageHeader } from '@shared/ui/page-header'
import { Pagination } from '@shared/ui/pagination'
import { QueryErrorPanel } from '@shared/ui/query-error-panel'
import { SearchToolbar } from '@shared/ui/search-toolbar'
import { Skeleton } from '@shared/ui/skeleton'
import { ApiError } from '@shared/api/http-client'

const PAGE = 20

const INBOX_QUERY_KEY = ['admin', 'contact-messages'] as const
const UNREAD_COUNT_KEY = ['admin', 'contact-messages', 'unread-count'] as const

/** Invalidates inbox list and sidebar unread badge after read-state changes. */
function invalidateInbox(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: INBOX_QUERY_KEY })
  qc.invalidateQueries({ queryKey: UNREAD_COUNT_KEY })
}

/**
 * Admin inbox for user-submitted contact messages and categorized feedback.
 */
export function SupportInboxPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search.trim())

  const { data: unreadCount = 0 } = useQuery({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: fetchContactUnreadCount,
  })

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [...INBOX_QUERY_KEY, page, unreadOnly, deferredSearch],
    queryFn: () =>
      fetchContactMessages({
        page,
        limit: PAGE,
        unreadOnly: unreadOnly || undefined,
        search: deferredSearch || undefined,
      }),
  })

  /** Updates the search query and returns to the first page of results. */
  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  const markRead = useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) => patchContactRead(id, read),
    onSuccess: () => invalidateInbox(qc),
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.message : 'Failed'
      toast.error(msg)
    },
  })

  const readAll = useMutation({
    mutationFn: markAllContactMessagesRead,
    onSuccess: (res) => {
      invalidateInbox(qc)
      toast.success(res.updated > 0 ? `Marked ${res.updated} as read` : 'Inbox is up to date')
    },
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.message : 'Failed'
      toast.error(msg)
    },
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE))

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Support"
        title="Inbox"
        description="Messages from Settings → Contact us (feedback, bugs, billing)."
      />

      <SearchToolbar
        value={search}
        onChange={handleSearchChange}
        label="Search inbox"
        placeholder="Search subject, message, category, sender email, name, or user id…"
      />

      <Card className="border-border/70 shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={unreadOnly}
              onChange={(e) => {
                setUnreadOnly(e.target.checked)
                setPage(1)
              }}
            />
            Unread only
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto"
            disabled={unreadCount <= 0 || readAll.isPending}
            onClick={() => readAll.mutate()}
          >
            Read all
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : isError ? (
        <QueryErrorPanel error={error} what="inbox messages" onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No messages.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((m) => (
            <MessageCard
              key={m.id}
              m={m}
              onOpen={() => {
                if (!m.read_at) markRead.mutate({ id: m.id, read: true })
              }}
              onMarkRead={() => markRead.mutate({ id: m.id, read: !m.read_at })}
            />
          ))}
        </ul>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        total={total}
        itemNoun="message"
      />
    </div>
  )
}

/**
 * Single inbox row with expandable body and read/unread control.
 */
function MessageCard({
  m,
  onOpen,
  onMarkRead,
}: {
  m: ContactMessageRow
  onOpen: () => void
  onMarkRead: () => void
}) {
  return (
    <ExpandableInboxCard
      unread={!m.read_at}
      icon={MailOpen}
      onFirstOpen={onOpen}
      badges={
        <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
          {m.category}
        </span>
      }
      title={m.subject}
      meta={
        <>
          <p className="text-xs text-muted-foreground">
            {m.name || '—'} · {m.email}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(m.created_at).toLocaleString()}
          </p>
        </>
      }
    >
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.message}</p>
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onMarkRead}>
        {m.read_at ? 'Mark unread' : 'Mark read'}
      </Button>
    </ExpandableInboxCard>
  )
}
