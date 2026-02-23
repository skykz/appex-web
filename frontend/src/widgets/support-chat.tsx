import { useState } from 'react'
import { X, MoreHorizontal, MessageCircle } from 'lucide-react'
import { cn } from '@shared/lib'
import { Avatar, AvatarFallback } from '@shared/ui'

export function SupportChat() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Floating trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full shadow-lg',
          'bg-primary text-primary-foreground',
          'transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95',
          open && 'pointer-events-none scale-0 opacity-0'
        )}
        aria-label="Open support chat"
      >
        <MessageCircle className="size-6" />
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[480px] w-80 flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 origin-bottom-right">
          {/* Header */}
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                F
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Fin</p>
              <p className="text-xs text-muted-foreground truncate">
                The team can also help
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted"
            >
              <MoreHorizontal className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted"
              aria-label="Close support chat"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Sub-header */}
          <div className="border-b px-4 py-2.5 text-center text-xs text-muted-foreground">
            Ask us anything, or share your feedback.
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-2">
              <div className="rounded-xl bg-muted px-3.5 py-2.5 text-sm leading-relaxed">
                Hey! Thanks for contacting Support Team🙌
              </div>
              <div className="rounded-xl bg-muted px-3.5 py-2.5 text-sm leading-relaxed">
                Are you registered on our platform?
              </div>
              <p className="text-[11px] text-muted-foreground">
                Fin · AI Agent · Just now
              </p>
            </div>
          </div>

          {/* Quick replies */}
          <div className="flex flex-col gap-2 border-t p-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted text-right"
            >
              Yes, I have an account 👍
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted text-right"
            >
              No, I am still considering 🤔
            </button>
          </div>
        </div>
      )}
    </>
  )
}
