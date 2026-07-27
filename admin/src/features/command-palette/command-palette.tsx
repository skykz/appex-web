import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  FolderTree,
  Inbox,
  LayoutDashboard,
  Search,
  Upload,
  Users,
  CreditCard,
  Undo2,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@shared/ui/button'
import { Input } from '@shared/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@shared/ui/dialog'

type CommandItem = {
  id: string
  label: string
  to: string
  icon: typeof LayoutDashboard
  keywords: string
}

const STATIC_COMMANDS: CommandItem[] = [
  {
    id: 'dash',
    label: 'Dashboard',
    to: '/dashboard',
    icon: LayoutDashboard,
    keywords: 'home metrics',
  },
  {
    id: 'cat',
    label: 'Categories',
    to: '/categories',
    icon: FolderTree,
    keywords: 'taxonomy skills groups',
  },
  {
    id: 'courses',
    label: 'Courses',
    to: '/courses',
    icon: BookOpen,
    keywords: 'skills modules lessons',
  },
  {
    id: 'users',
    label: 'Users',
    to: '/users',
    icon: Users,
    keywords: 'people directory accounts',
  },
  {
    id: 'billing',
    label: 'Billing',
    to: '/billing',
    icon: CreditCard,
    keywords: 'subscriptions plans payments revenue stripe',
  },
  {
    id: 'refunds',
    label: 'Refunds',
    to: '/refunds',
    icon: Undo2,
    keywords: 'refund chargeback money back stripe policy',
  },
  {
    id: 'billing-alerts',
    label: 'Billing alerts',
    to: '/billing-alerts',
    icon: AlertTriangle,
    keywords: 'alerts stuck weekly conversion failed stripe broken subscription',
  },
  {
    id: 'inbox',
    label: 'Inbox',
    to: '/support',
    icon: Inbox,
    keywords: 'support contact messages',
  },
  {
    id: 'submissions',
    label: 'Submissions',
    to: '/submissions',
    icon: Upload,
    keywords: 'homework student work',
  },
]

/**
 * Global quick-jump palette (Ctrl/Cmd+K or /) for common admin routes and opening a course by id.
 */
export function CommandPalette() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [courseId, setCourseId] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return STATIC_COMMANDS
    return STATIC_COMMANDS.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.keywords.toLowerCase().includes(q) ||
        c.to.includes(q)
    )
  }, [query])

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setCourseId('')
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
        return
      }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        const el = e.target as HTMLElement | null
        const tag = el?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable) return
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function go(to: string) {
    navigate(to)
    close()
  }

  function goCourse() {
    const id = Number(courseId.trim())
    if (!Number.isFinite(id) || id < 1) return
    go(`/courses/${id}`)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden border-border/80 p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border/60 bg-muted/30 px-4 py-3 text-left">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" aria-hidden />
            Command palette
          </DialogTitle>
          <DialogDescription className="text-xs">
            Ctrl+K or / — jump to a section or open a course by numeric id.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 p-4">
          <Input
            autoFocus
            placeholder="Filter commands…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9"
          />
          <ul className="max-h-56 space-y-1 overflow-y-auto">
            {filtered.map((c) => {
              const Icon = c.icon
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => go(c.to)}
                    className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left text-sm transition-colors hover:border-border hover:bg-muted/50"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="font-medium">{c.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="flex gap-2 border-t pt-3">
            <Input
              placeholder="Course id (number)"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="h-9 flex-1 font-mono text-xs"
              onKeyDown={(e) => e.key === 'Enter' && goCourse()}
            />
            <Button type="button" size="sm" className="shrink-0" onClick={goCourse}>
              Open
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
