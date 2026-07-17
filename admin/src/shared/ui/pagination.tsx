import { Button } from '@shared/ui/button'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  /** Total item count; when provided, shows a "· N noun(s)" summary. */
  total?: number
  /** Singular noun for the summary, e.g. "user". Pluralized with a trailing "s". */
  itemNoun?: string
}

/**
 * Shared Previous/Next pagination footer with a page/total summary.
 * Clamps navigation to [1, totalPages].
 */
export function Pagination({ page, totalPages, onPageChange, total, itemNoun }: PaginationProps) {
  const summary =
    total != null && itemNoun
      ? `Page ${page} of ${totalPages} · ${total} ${itemNoun}${total === 1 ? '' : 's'}`
      : `Page ${page} of ${totalPages}`

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>{summary}</span>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
