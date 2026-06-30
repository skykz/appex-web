/**
 * Derives a short uppercase file-type badge from a display label or download URL (e.g. TXT, PDF).
 */
export function fileTypeBadge(label: string, url: string): string {
  const fromLabel = label.trim().split('.').pop()
  if (fromLabel && fromLabel.length <= 5 && fromLabel !== label.trim()) {
    return fromLabel.toUpperCase()
  }

  try {
    const path = new URL(url).pathname
    const ext = path.split('.').pop()
    if (ext && ext.length <= 5) return ext.toUpperCase()
  } catch {
    const ext = url.split('.').pop()?.split(/[?#]/)[0]
    if (ext && ext.length <= 5) return ext.toUpperCase()
  }

  return 'FILE'
}
