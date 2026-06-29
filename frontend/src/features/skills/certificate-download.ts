import { jsPDF } from 'jspdf'
import {
  buildCertificateSvg,
  CERT_HEIGHT,
  CERT_WIDTH,
  type CertificateData,
} from './certificate-svg'

export type { CertificateData } from './certificate-svg'
export {
  buildCertificateSvg,
  certificateToDownloadData,
  CERT_HEIGHT,
  CERT_WIDTH,
  formatIssuedDate,
} from './certificate-svg'

const CERTIFICATE_FILENAME = 'certificate.pdf'

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
