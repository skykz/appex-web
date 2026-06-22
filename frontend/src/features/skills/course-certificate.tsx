import { useMemo } from 'react'
import { buildCertificateSvg, type CertificateData } from './certificate-download'

type CourseCertificateProps = CertificateData

/**
 * On-screen certificate preview. Renders the same designer SVG template used for
 * PNG download (see buildCertificateSvg) so preview and file always match exactly.
 */
export function CourseCertificate(props: CourseCertificateProps) {
  const { recipientName, courseTitle, description, certCode, issuedAt, tags } = props

  const svgMarkup = useMemo(
    () =>
      buildCertificateSvg({
        recipientName,
        courseTitle,
        description,
        certCode,
        issuedAt,
        tags,
      }),
    [recipientName, courseTitle, description, certCode, issuedAt, tags]
  )

  return (
    <div
      className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5 [&_svg]:block [&_svg]:h-full [&_svg]:w-full"
      role="img"
      aria-label={`Certificate of completion for ${recipientName}: ${courseTitle}`}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  )
}
