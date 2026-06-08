import { createHmac, timingSafeEqual } from 'crypto'

export interface MailgunSignaturePayload {
  timestamp: string
  token: string
  signature: string
}

/**
 * Verifies Mailgun webhook HMAC signatures to reject forged event callbacks.
 */
export function verifyMailgunWebhookSignature(
  signingKey: string,
  payload: MailgunSignaturePayload
): boolean {
  if (!signingKey || !payload.timestamp || !payload.token || !payload.signature) {
    return false
  }

  const ageSec = Math.abs(Date.now() / 1000 - Number(payload.timestamp))
  if (!Number.isFinite(ageSec) || ageSec > 15 * 60) {
    return false
  }

  const digest = createHmac('sha256', signingKey)
    .update(payload.timestamp + payload.token)
    .digest('hex')

  try {
    const a = Buffer.from(digest, 'utf8')
    const b = Buffer.from(payload.signature, 'utf8')
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}
