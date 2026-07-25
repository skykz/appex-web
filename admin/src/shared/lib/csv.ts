/**
 * Quotes a CSV field when it contains a comma, quote, or newline (RFC 4180 style).
 */
export function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

/**
 * Builds a CRLF-delimited CSV string from a header row and typed data rows.
 * `mapRow` returns the ordered cell values for one row; each cell is escaped.
 */
export function toCsv<T>(
  headers: readonly string[],
  rows: readonly T[],
  mapRow: (row: T) => readonly (string | number | null | undefined)[]
): string {
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      mapRow(row)
        .map((cell) => escapeCsvField(cell == null ? '' : String(cell)))
        .join(',')
    ),
  ]
  return lines.join('\r\n')
}

/**
 * Triggers a browser download of the given CSV text under `filename`.
 */
export function downloadCsvFile(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
