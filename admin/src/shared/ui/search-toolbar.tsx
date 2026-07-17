import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Card, CardContent } from '@shared/ui/card'
import { Input } from '@shared/ui/input'

interface SearchToolbarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Accessible label for the search input (visually hidden). */
  label?: string
  /** Optional right-aligned controls, e.g. an export button. */
  actions?: ReactNode
}

/**
 * Shared filter bar: a leading-icon search input inside a card, with optional
 * right-aligned actions. Standardizes the search UX across list pages.
 */
export function SearchToolbar({
  value,
  onChange,
  placeholder = 'Search…',
  label = 'Search',
  actions,
}: SearchToolbarProps) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-10 border-border/80 pl-9 shadow-sm"
            placeholder={placeholder}
            aria-label={label}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
        {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
      </CardContent>
    </Card>
  )
}
