import { parseCertTags } from './cert-form-utils'

const PREVIEW_RECIPIENT = 'Jane Doe'
const PREVIEW_CERT_CODE = 'APX-2026-000000'

export type CertificatePreviewDraft = {
  cert_title?: string
  cert_description?: string
  cert_tags_text?: string
  /** Catalog title used when certificate title is empty. */
  courseTitle?: string
}

export type CertificatePreviewData = {
  recipientName: string
  courseTitle: string
  description: string
  certCode: string
  issuedAt: string
  tags: string[]
}

/**
 * Builds certificate render data from unsaved admin form fields and fixed sample
 * learner metadata (name, date, credential ID).
 */
export function buildCertificatePreviewData(
  draft: CertificatePreviewDraft
): CertificatePreviewData {
  const courseTitle =
    draft.cert_title?.trim() || draft.courseTitle?.trim() || 'Course Title'

  return {
    recipientName: PREVIEW_RECIPIENT,
    courseTitle,
    description: draft.cert_description?.trim() || '',
    certCode: PREVIEW_CERT_CODE,
    issuedAt: new Date().toISOString(),
    tags: parseCertTags(draft.cert_tags_text),
  }
}

export const certificatePreviewSample = {
  recipientName: PREVIEW_RECIPIENT,
  certCode: PREVIEW_CERT_CODE,
} as const
