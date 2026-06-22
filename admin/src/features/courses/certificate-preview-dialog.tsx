import { useMemo } from 'react'
import { buildCertificateSvg } from '@appex/certificate/certificate-download'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@shared/ui/dialog'
import {
  buildCertificatePreviewData,
  certificatePreviewSample,
  type CertificatePreviewDraft,
} from './certificate-preview-data'

interface CertificatePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  draft: CertificatePreviewDraft
}

/**
 * Dialog that renders the same designer SVG learners receive, using draft admin
 * certificate fields and sample per-user placeholders.
 */
export function CertificatePreviewDialog({
  open,
  onOpenChange,
  draft,
}: CertificatePreviewDialogProps) {
  const data = useMemo(() => buildCertificatePreviewData(draft), [draft])
  const svgMarkup = useMemo(() => buildCertificateSvg(data), [data])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Certificate preview</DialogTitle>
          <DialogDescription>
            Sample name ({certificatePreviewSample.recipientName}) and ID (
            {certificatePreviewSample.certCode}). Title, description, and tags reflect the
            current form — including unsaved edits.
          </DialogDescription>
        </DialogHeader>
        <div
          className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-white ring-1 ring-border [&_svg]:block [&_svg]:h-full [&_svg]:w-full"
          role="img"
          aria-label={`Certificate preview for ${data.courseTitle}`}
          dangerouslySetInnerHTML={{ __html: svgMarkup }}
        />
      </DialogContent>
    </Dialog>
  )
}
