import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  FileText,
  Copy,
  Trash2,
  Pencil,
  Library,
  Sparkles,
} from 'lucide-react'
import { cn } from '@shared/lib'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Skeleton,
  Textarea,
} from '@shared/ui'
import {
  fetchPromptCategories,
  fetchPrompts,
  fetchMyPromptCategories,
  fetchMyPrompts,
  createMyPrompt,
  updateMyPrompt,
  deleteMyPrompt,
  type PromptRecord,
  type UserPromptRecord,
} from '@features/prompts/api'

type TabId = 'curated' | 'mine'

/**
 * Groups prompts by category for section headings.
 */
function groupByCategory<T extends { category: string }>(
  items: T[],
  categoryOrder: string[]
): { category: string; items: T[] }[] {
  const map = new Map<string, T[]>()
  for (const p of items) {
    const list = map.get(p.category) ?? []
    list.push(p)
    map.set(p.category, list)
  }
  const ordered: { category: string; items: T[] }[] = []
  const catOrder = categoryOrder.length ? categoryOrder : [...map.keys()].sort()
  for (const cat of catOrder) {
    const list = map.get(cat)
    if (list?.length) ordered.push({ category: cat, items: list })
  }
  for (const cat of map.keys()) {
    if (!catOrder.includes(cat)) {
      const list = map.get(cat)
      if (list?.length) ordered.push({ category: cat, items: list })
    }
  }
  return ordered
}

/**
 * Prompt library: curated starters plus the learner’s own saved prompts (categories + CRUD).
 */
export default function PromptsLibraryPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<TabId>('curated')
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [copyToast, setCopyToast] = useState<string | null>(null)

  const [draftTitle, setDraftTitle] = useState('')
  const [draftCategory, setDraftCategory] = useState('General')
  const [draftContent, setDraftContent] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<UserPromptRecord | null>(
    null
  )

  const { data: categories = [] } = useQuery({
    queryKey: ['prompt-categories'],
    queryFn: fetchPromptCategories,
    enabled: tab === 'curated',
  })

  const { data: prompts = [], isPending, isError, refetch } = useQuery({
    queryKey: ['prompts', search, activeCategory],
    queryFn: () =>
      fetchPrompts({
        search: search.trim() || undefined,
        category: activeCategory ?? undefined,
      }),
    enabled: tab === 'curated',
  })

  const { data: myCategories = [] } = useQuery({
    queryKey: ['prompt-mine-categories'],
    queryFn: fetchMyPromptCategories,
    enabled: tab === 'mine',
  })

  const {
    data: myPrompts = [],
    isPending: minePending,
    isError: mineError,
    refetch: refetchMine,
  } = useQuery({
    queryKey: ['prompts-mine', search, activeCategory],
    queryFn: () =>
      fetchMyPrompts({
        search: search.trim() || undefined,
        category: activeCategory ?? undefined,
      }),
    enabled: tab === 'mine',
  })

  const curatedGrouped = useMemo(
    () => groupByCategory(prompts, categories),
    [prompts, categories]
  )

  const mineGrouped = useMemo(
    () => groupByCategory(myPrompts, myCategories),
    [myPrompts, myCategories]
  )

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!draftTitle.trim() || !draftCategory.trim() || !draftContent.trim()) {
        throw new Error('Fill in title, category, and prompt text.')
      }
      if (editingId) {
        return updateMyPrompt(editingId, {
          title: draftTitle.trim(),
          category: draftCategory.trim(),
          content: draftContent,
        })
      }
      return createMyPrompt({
        title: draftTitle.trim(),
        category: draftCategory.trim(),
        content: draftContent,
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['prompts-mine'] })
      void qc.invalidateQueries({ queryKey: ['prompt-mine-categories'] })
      setDraftTitle('')
      setDraftCategory('General')
      setDraftContent('')
      setEditingId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMyPrompt(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['prompts-mine'] })
      void qc.invalidateQueries({ queryKey: ['prompt-mine-categories'] })
      setPendingDelete(null)
    },
  })

  /**
   * Copies text to the clipboard and shows a short confirmation label.
   */
  function handleCopy(text: string, label: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopyToast(label)
      window.setTimeout(() => setCopyToast(null), 2000)
    })
  }

  /**
   * Loads a user prompt into the editor for updating.
   */
  function startEdit(p: UserPromptRecord) {
    setEditingId(p.id)
    setDraftTitle(p.title)
    setDraftCategory(p.category)
    setDraftContent(p.content)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingId(null)
    setDraftTitle('')
    setDraftCategory('General')
    setDraftContent('')
  }

  const pending = tab === 'curated' ? isPending : minePending
  const error = tab === 'curated' ? isError : mineError
  const refetchTab = tab === 'curated' ? refetch : refetchMine
  const listForTab = tab === 'curated' ? curatedGrouped : mineGrouped

  return (
    <div className="relative min-h-dvh w-full py-2">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-linear-to-b from-primary/[0.05] to-transparent" />
      <div className="relative px-4">
        <div className="mb-1 flex items-center gap-2 text-muted-foreground">
          <FileText className="size-4" />
          <span className="text-sm font-medium">Resources</span>
        </div>

        <h1 className="mb-2 text-2xl font-bold tracking-tight md:text-3xl">
          Prompt library
        </h1>
        <p className="mb-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Browse ready-made ideas under <strong className="text-foreground">Starters</strong>, or
          open <strong className="text-foreground">My prompts</strong> to add your own titles,
          categories, and text. Expand any card to read—use <strong className="text-foreground">Copy</strong>{' '}
          to paste into AI Chat or anywhere else.
        </p>

        <div className="mb-5 inline-flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => {
              setTab('curated')
              setActiveCategory(null)
            }}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all',
              tab === 'curated'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Sparkles className="size-4" />
            Starters
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('mine')
              setActiveCategory(null)
            }}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all',
              tab === 'mine'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Library className="size-4" />
            My prompts
          </button>
        </div>

        {tab === 'mine' ? (
          <section className="mb-8 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
            <h2 className="mb-1 text-lg font-semibold">
              {editingId ? 'Edit prompt' : 'New prompt'}
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Use a category to group prompts (for example &quot;Email&quot; or &quot;Meetings&quot;). The same name on several prompts keeps them together in the list.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pm-title">Title</Label>
                <Input
                  id="pm-title"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="Short label"
                  disabled={saveMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pm-cat">Category</Label>
                <Input
                  id="pm-cat"
                  value={draftCategory}
                  onChange={(e) => setDraftCategory(e.target.value)}
                  placeholder="General"
                  disabled={saveMutation.isPending}
                />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label htmlFor="pm-body">Prompt text</Label>
              <Textarea
                id="pm-body"
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                placeholder="Paste or write the full prompt…"
                className="min-h-[140px]"
                disabled={saveMutation.isPending}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending
                  ? 'Saving…'
                  : editingId
                    ? 'Save changes'
                    : 'Save to library'}
              </Button>
              {editingId ? (
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
              ) : null}
            </div>
            {saveMutation.isError ? (
              <p className="mt-2 text-sm text-destructive">
                {(saveMutation.error as Error)?.message ?? 'Could not save.'}
              </p>
            ) : null}
          </section>
        ) : null}

        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              tab === 'curated' ? 'Search starters…' : 'Search my prompts…'
            }
            className="rounded-xl pl-10"
          />
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-200',
              activeCategory === null
                ? 'border-foreground bg-foreground text-background'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            All
          </button>
          {(tab === 'curated' ? categories : myCategories).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() =>
                setActiveCategory(activeCategory === cat ? null : cat)
              }
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-200',
                activeCategory === cat
                  ? 'border-foreground bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {copyToast ? (
          <p className="mb-3 text-sm font-medium text-emerald-600" role="status">
            Copied {copyToast} to clipboard.
          </p>
        ) : null}

        {pending ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-8 text-center">
            <p className="text-sm text-destructive">Could not load prompts.</p>
            <button
              type="button"
              onClick={() => refetchTab()}
              className="mt-3 text-sm font-semibold text-primary hover:underline"
            >
              Retry
            </button>
          </div>
        ) : listForTab.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 py-14 text-center">
            <p className="text-muted-foreground text-sm">
              {tab === 'curated'
                ? 'No starters match your filters.'
                : 'No saved prompts yet—use the form above to add one.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-8 pb-8">
            {tab === 'curated'
              ? curatedGrouped.map(({ category, items }) => (
                  <div key={category}>
                    <h2 className="mb-3 text-lg font-bold">{category}</h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {items.map((prompt) => (
                        <PromptCardCurated
                          key={prompt.id}
                          prompt={prompt}
                          onCopy={(text) =>
                            handleCopy(text, `"${prompt.title}"`)
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))
              : mineGrouped.map(({ category, items }) => (
                  <div key={category}>
                    <h2 className="mb-3 text-lg font-bold">{category}</h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {items.map((prompt) => (
                        <PromptCardMine
                          key={prompt.id}
                          prompt={prompt}
                          onCopy={(text) =>
                            handleCopy(text, `"${prompt.title}"`)
                          }
                          onEdit={() => startEdit(prompt)}
                          onDelete={() => setPendingDelete(prompt)}
                          deleting={
                            deleteMutation.isPending &&
                            pendingDelete?.id === prompt.id
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))}
          </div>
        )}
      </div>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setPendingDelete(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete prompt?</DialogTitle>
            <DialogDescription>
              This removes
              {pendingDelete ? ` “${pendingDelete.title}” ` : ' this prompt '}
              from your library. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleteMutation.isPending}
              onClick={() => setPendingDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (pendingDelete) deleteMutation.mutate(pendingDelete.id)
              }}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
          {deleteMutation.isError ? (
            <p className="text-sm text-destructive">
              {(deleteMutation.error as Error)?.message ?? 'Could not delete.'}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * Expandable card for a curated starter prompt with copy-to-clipboard.
 */
function PromptCardCurated({
  prompt,
  onCopy,
}: {
  prompt: PromptRecord
  onCopy: (text: string) => void
}) {
  return (
    <details className="group rounded-xl border bg-card text-left shadow-sm transition-all open:ring-2 open:ring-ring/40">
      <summary className="cursor-pointer list-none px-4 py-4 text-sm font-medium marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          {prompt.title}
          <span className="text-xs font-normal text-muted-foreground opacity-0 transition-opacity group-open:opacity-100">
            Tap to expand
          </span>
        </span>
      </summary>
      <div className="border-t px-4 py-3 text-sm leading-relaxed text-muted-foreground">
        <pre className="mb-3 whitespace-pre-wrap break-words font-sans">
          {prompt.content}
        </pre>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => onCopy(prompt.content)}
        >
          <Copy className="size-3.5" />
          Copy text
        </Button>
      </div>
    </details>
  )
}

/**
 * Expandable card for a user-saved prompt with copy, edit, and delete actions.
 */
function PromptCardMine({
  prompt,
  onCopy,
  onEdit,
  onDelete,
  deleting,
}: {
  prompt: UserPromptRecord
  onCopy: (text: string) => void
  onEdit: () => void
  onDelete: () => void
  deleting: boolean
}) {
  return (
    <details className="group rounded-xl border bg-card text-left shadow-sm transition-all open:ring-2 open:ring-ring/40">
      <summary className="cursor-pointer list-none px-4 py-4 text-sm font-medium marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          {prompt.title}
          <span className="text-xs font-normal text-muted-foreground opacity-0 transition-opacity group-open:opacity-100">
            Tap to expand
          </span>
        </span>
      </summary>
      <div className="border-t px-4 py-3 text-sm leading-relaxed text-muted-foreground">
        <pre className="mb-3 whitespace-pre-wrap break-words font-sans">
          {prompt.content}
        </pre>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => onCopy(prompt.content)}
          >
            <Copy className="size-3.5" />
            Copy text
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={(e) => {
              e.preventDefault()
              onEdit()
            }}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={deleting}
            onClick={(e) => {
              e.preventDefault()
              onDelete()
            }}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        </div>
      </div>
    </details>
  )
}
