/** Parses newline-separated skill tags for the certificate API payload. */
export function parseCertTags(text?: string): string[] {
  if (!text?.trim()) return []
  return text
    .split(/\r?\n/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8)
}
