export type CertificateData = {
  /** Learner name shown on the credential line. */
  recipientName: string
  /** Course title — rendered as the large display headline. */
  courseTitle: string
  /** One-line summary of what the course covered. */
  description: string
  /** Real, minted credential code (e.g. "APX-2026-000142"). */
  certCode: string
  /** ISO timestamp the certificate was issued. */
  issuedAt: string
}

const CERT_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** Orange brand accent used across the certificate (matches `--primary`). */
const BRAND = '#F97316'

/** Formats an ISO timestamp as e.g. "21 June 2026". */
export function formatIssuedDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getDate()} ${CERT_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Wraps text into lines no wider than `maxChars`, capped at `maxLines`. */
function wrapText(text: string, maxChars: number, maxLines: number) {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      lines.push(current)
      current = word
      if (lines.length === maxLines - 1) break
    } else {
      current = next
    }
  }
  if (current && lines.length < maxLines) lines.push(current)
  return lines
}

/**
 * Builds the certificate as a standalone SVG string (Appex branding, orange
 * accent). Used for the downloaded file so it matches the on-screen preview.
 */
export function buildCertificateSvg({ recipientName, courseTitle, description, certCode, issuedAt }: CertificateData) {
  const issuedOn = formatIssuedDate(issuedAt)

  const titleLines = wrapText(courseTitle.toUpperCase(), 14, 2)
  const titleStartY = titleLines.length > 1 ? 215 : 250
  const descLines = wrapText(description, 78, 3)

  const titleTspans = titleLines
    .map((line, i) => `<text x="120" y="${titleStartY + i * 95}" class="title">${escapeXml(line)}</text>`)
    .join('')
  const descTspans = descLines
    .map((line, i) => `<text x="120" y="${720 + i * 34}" class="desc">${escapeXml(line)}</text>`)
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2000 1125" width="2000" height="1125" font-family="Georgia, 'Times New Roman', serif">
  <rect width="2000" height="1125" fill="#ffffff"/>
  <style>
    .eyebrow { font-size: 34px; fill: #222; }
    .title { font-size: 96px; font-weight: 700; fill: #0A0A0A; letter-spacing: 1px; }
    .name { font-size: 56px; fill: #0A0A0A; letter-spacing: 2px; }
    .desc { font-size: 26px; fill: #333; }
    .meta { font-size: 24px; fill: #444; }
    .brand { font-size: 40px; font-weight: 700; fill: #0A0A0A; letter-spacing: -0.5px; }
    .sigrole { font-size: 22px; fill: #555; }
  </style>

  <path d="M1640 0 h140 v245 l-70 -45 -70 45 Z" fill="${BRAND}"/>
  <path d="M1665 22 h90 v175 l-45 -28 -45 28 Z" fill="none" stroke="#ffffff" stroke-width="4"/>

  <text x="120" y="135" class="eyebrow">Certificate of completion</text>
  ${titleTspans}

  <text x="120" y="615" class="name">${escapeXml(recipientName.toUpperCase())}</text>
  <line x1="120" y1="650" x2="1140" y2="650" stroke="#9aa4b2" stroke-width="3"/>
  ${descTspans}

  <line x1="245" y1="985" x2="500" y2="985" stroke="#9aa4b2" stroke-width="2"/>
  <text x="372" y="975" text-anchor="middle" class="meta">${escapeXml(issuedOn)}</text>
  <text x="372" y="1025" text-anchor="middle" class="meta">ID: ${escapeXml(certCode)}</text>

  <rect x="905" y="985" width="46" height="46" rx="10" fill="${BRAND}"/>
  <text x="928" y="1018" text-anchor="middle" font-size="30" font-weight="700" fill="#ffffff">A</text>
  <text x="965" y="1022" class="brand">Appex</text>

  <path d="M1455 985 c10 -4 12 -28 22 -28 s4 36 14 36 s10 -32 20 -32 s4 26 14 26 s12 -18 22 -18" fill="none" stroke="#1a1a1a" stroke-width="3" stroke-linecap="round"/>
  <text x="1530" y="1075" text-anchor="middle" class="sigrole">Course instructor</text>

  <path d="M1700 985 c10 6 10 -26 20 -26 s0 38 10 38 s12 -40 22 -34 s2 28 16 26" fill="none" stroke="#1a1a1a" stroke-width="3" stroke-linecap="round"/>
  <text x="1770" y="1075" text-anchor="middle" class="sigrole">Founder, Appex</text>
</svg>`
}

/** Derives a safe download filename (no extension) from the credential. */
function certFileBase(data: CertificateData): string {
  if (data.certCode) return data.certCode
  const slug = data.courseTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `appex-certificate-${slug || 'course'}`
}

/** Saves a Blob to disk via a temporary anchor. */
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Native canvas dimensions — matches the SVG viewBox (16:9, print-grade). */
const CERT_WIDTH = 2000
const CERT_HEIGHT = 1125

/**
 * Downloads the certificate as a high-resolution PNG image.
 *
 * The SVG (see buildCertificateSvg) is rasterized onto a canvas: this keeps a
 * single source of truth for the design while producing a shareable image that
 * works everywhere (LinkedIn, messengers, etc.). Resolves once the file has
 * been handed to the browser; rejects if the SVG fails to load.
 */
export function downloadCertificate(data: CertificateData): Promise<void> {
  const svg = buildCertificateSvg(data)
  const svgUrl = URL.createObjectURL(
    new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  )

  return new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = CERT_WIDTH
        canvas.height = CERT_HEIGHT
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas 2D context unavailable')
        // White matte so transparent areas read as paper, not checkerboard.
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, CERT_WIDTH, CERT_HEIGHT)
        ctx.drawImage(img, 0, 0, CERT_WIDTH, CERT_HEIGHT)
        canvas.toBlob((blob) => {
          if (blob) saveBlob(blob, `${certFileBase(data)}.png`)
          resolve()
        }, 'image/png')
      } catch (err) {
        reject(err)
      } finally {
        URL.revokeObjectURL(svgUrl)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl)
      reject(new Error('Failed to render certificate image'))
    }
    img.src = svgUrl
  })
}
