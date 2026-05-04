/**
 * Detects values stored in legacy “emoji” fields that should render as an image in UI.
 * Supports `https?`, site-relative paths, and small inlined raster images from admin upload.
 */
export function isLikelyImageBadgeUrl(value: string): boolean {
  const s = value.trim()
  if (!s) return false
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(s)) return true
  if (s.startsWith('http://') || s.startsWith('https://')) return true
  if (s.startsWith('/') && s.length > 1) return true
  return false
}
