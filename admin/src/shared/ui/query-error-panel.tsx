import { Button } from '@shared/ui/button'

interface QueryErrorPanelProps {
  error: unknown
  /**
   * Noun describing what failed to load, e.g. "users", "billing history".
   * Optional so a caller can drop the panel in without inventing a label,
   * but pass it wherever the page knows — "Failed to load users" beats
   * "Failed to load this data".
   */
  what?: string
  onRetry?: () => void
}

/**
 * Shared error panel for a failed list/data query. Without this, a failed request
 * and "no data yet" render identically — this makes the failure visible and
 * offers a retry instead of silently showing an empty state.
 */
export function QueryErrorPanel({ error, what = 'this data', onRetry }: QueryErrorPanelProps) {
  const message = error instanceof Error ? error.message : 'Unknown error'
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive shadow-sm"
    >
      <span>
        Failed to load {what}: {message}
      </span>
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  )
}
