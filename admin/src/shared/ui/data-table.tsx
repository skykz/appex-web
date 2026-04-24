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

export function DataTable<T>({ rows, columns, getRowKey, empty, onRowClick }: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
        {empty ?? 'No data.'}
      </div>
    )
  }
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn('px-4 py-3 text-left font-medium text-muted-foreground', c.className)}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'border-t',
                onRowClick && 'cursor-pointer hover:bg-muted/40'
              )}
            >
              {columns.map((c) => (
                <td key={c.key} className={cn('px-4 py-3', c.className)}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
