import { jsPDF } from 'jspdf'
import certificateTemplate from './certificate-template.svg?raw'

export type CertificateData = {
  /** Learner name shown on the credential line. */
  recipientName: string
  /** Certificate display title (newline separates lines). */
  courseTitle: string
  /** Description body (newline separates lines). */
  description: string
  /** Real, minted credential code (e.g. "APX-2026-000142"). */
  certCode: string
  /** ISO timestamp the certificate was issued. */
  issuedAt: string
  /** Skill tags rendered as pills on the certificate. */
  tags: string[]
}

const CERT_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** High-res raster size for PDF export — 2.5× the 800×450 designer template. */
export const CERT_WIDTH = 2000
export const CERT_HEIGHT = 1125

const CERTIFICATE_FILENAME = 'certificate.pdf'

/** Formats an ISO timestamp as e.g. "21 June 2026". */
export function formatIssuedDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getDate()} ${CERT_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** Escapes text for safe inclusion inside SVG markup. */
function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Splits multiline admin text into up to two trimmed lines for the template.
 */
function splitLines(value: string, maxLines = 2): string[] {
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  while (lines.length < maxLines) lines.push('')
  return lines.slice(0, maxLines)
}

/**
 * Builds orange pill badges for skill tags. Width is estimated from label length.
 */
function buildTagsSvg(tags: string[]): string {
  if (!tags.length) return ''

  const startX = 52
  const y = 326
  const height = 25
  const gap = 10
  const charWidth = 7
  const padding = 24
  const maxX = 748

  let x = startX
  const parts: string[] = []

  for (const tag of tags) {
    const label = tag.trim()
    if (!label) continue

    const width = Math.max(label.length * charWidth + padding, 60)
    if (x + width > maxX) break

    const cx = x + width / 2
    parts.push(
      `<rect x="${x.toFixed(1)}" y="${y}" width="${width.toFixed(1)}" height="${height}" rx="12.5" fill="none" stroke="#FF6A00" stroke-width="1"/>`,
      `<text x="${cx.toFixed(1)}" y="338.5" font-family="Inter, Arial, sans-serif" font-size="12" fill="#0A0A0A" text-anchor="middle" dominant-baseline="central">${escapeXml(label)}</text>`
    )
    x += width + gap
  }

  return parts.join('\n  ')
}

/**
 * Fills the designer SVG template with learner-specific and course-specific values.
 */
export function buildCertificateSvg({
  recipientName,
  courseTitle,
  description,
  certCode,
  issuedAt,
  tags,
}: CertificateData): string {
  const [titleLine1, titleLine2] = splitLines(courseTitle)
  const [descriptionLine1, descriptionLine2] = splitLines(description)

  return certificateTemplate
    .replaceAll('{{full_name}}', escapeXml(recipientName))
    .replaceAll('{{issue_date}}', escapeXml(formatIssuedDate(issuedAt)))
    .replaceAll('{{certificate_id}}', escapeXml(certCode))
    .replaceAll('{{cert_title_line1}}', escapeXml(titleLine1))
    .replaceAll('{{cert_title_line2}}', escapeXml(titleLine2))
    .replaceAll('{{cert_description_line1}}', escapeXml(descriptionLine1))
    .replaceAll('{{cert_description_line2}}', escapeXml(descriptionLine2))
    .replaceAll('{{cert_tags}}', buildTagsSvg(tags))
}

/** Maps a minted API certificate into download/preview data. */
export function certificateToDownloadData(
  certificate: {
    user_name: string
    course_title: string
    cert_description: string
    cert_tags: string[]
    cert_code: string
    issued_at: string
  },
  fallbackName?: string
): CertificateData {
  return {
    recipientName: certificate.user_name || fallbackName || 'Appex Learner',
    courseTitle: certificate.course_title,
    description: certificate.cert_description,
    certCode: certificate.cert_code,
    issuedAt: certificate.issued_at,
    tags: certificate.cert_tags ?? [],
  }
}

/**
 * Downloads the certificate as a PDF file named `certificate.pdf`.
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
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, CERT_WIDTH, CERT_HEIGHT)
        ctx.drawImage(img, 0, 0, CERT_WIDTH, CERT_HEIGHT)

        const imgData = canvas.toDataURL('image/png')
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'px',
          format: [CERT_WIDTH, CERT_HEIGHT],
          hotfixes: ['px_scaling'],
        })
        pdf.addImage(imgData, 'PNG', 0, 0, CERT_WIDTH, CERT_HEIGHT)
        pdf.save(CERTIFICATE_FILENAME)
        resolve()
      } catch (err) {
        reject(err)
      } finally {
        URL.revokeObjectURL(svgUrl)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl)
      reject(new Error('Failed to render certificate PDF'))
    }
    img.src = svgUrl
  })
}

