import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@shared/lib'
import { Button } from '@shared/ui/button'

interface CopyPromptCardProps {
  /** Card heading shown above the copyable prompt text. */
  title: string
  /** Full prompt body copied when the user clicks the copy control. */
  content: string
  className?: string
}

/**
 * Copyable prompt card for lesson previews.
 * Matches the learner-facing handoff-prompt layout: title row + copy control.
 */
export function CopyPromptCard({ title, content, className }: CopyPromptCardProps) {
  const [copied, setCopied] = useState(false)

  /** Copies the prompt body to the clipboard and shows brief confirmation. */
  async function handleCopy() {
    if (!content.trim()) return
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      toast.success('Prompt copied')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy — check browser permissions')
    }
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border/80 bg-muted/25 shadow-sm',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
        <p className="text-sm font-semibold text-foreground">{title || 'Prompt'}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={copied ? 'Copied' : 'Copy prompt'}
          onClick={() => void handleCopy()}
          disabled={!content.trim()}
        >
          {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
        </Button>
      </div>
      <p className="whitespace-pre-wrap px-4 py-3 font-mono text-[13px] leading-relaxed text-foreground">
        {content || 'Add prompt text below…'}
      </p>
    </div>
  )
}
