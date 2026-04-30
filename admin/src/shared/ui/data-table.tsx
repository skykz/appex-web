import { cn } from '@shared/lib'
import { type ReactNode } from 'react'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  rows: T[]
  columns: Column<T>[]
  getRowKey: (row: T) => string | number
  empty?: ReactNode
  onRowClick?: (row: T) => void
}

/** Renders a styled admin table with hover rows, sticky header, and an empty state panel. */
export function DataTable<T>({ rows, columns, getRowKey, empty, onRowClick }: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border/80 bg-card/80 p-12 text-center text-sm text-muted-foreground shadow-sm backdrop-blur-[2px]">
        {empty ?? 'No data.'}
      </div>
    )
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-[1] border-b border-border/60 bg-gradient-to-r from-orange-50/50 via-muted/45 to-sky-50/35 backdrop-blur-sm">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    'whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground',
                    c.className
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((row) => (
              <tr
                key={getRowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'transition-colors',
                  onRowClick
                    ? 'cursor-pointer hover:bg-muted/50'
                    : 'hover:bg-muted/30'
                )}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-4 py-3.5 align-middle', c.className)}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
