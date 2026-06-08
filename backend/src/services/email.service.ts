import { env } from '../config/env.js'

const MAILGUN_TIMEOUT_MS = 15_000
const RETRYABLE_STATUS = new Set([502, 503, 504])

export interface SendEmailInput {
  to: string
  subject: string
  html: string
  text?: string
  /** Optional Mailgun tag for analytics and filtering in the dashboard. */
  tag?: string
  /** When set, adds List-Unsubscribe for CAN-SPAM compliance on marketing mail. */
  listUnsubscribeMailto?: string
  /** When set, Mailgun delivers at this time (used for E2 ~1 min delay). */
  deliveryTime?: Date
}

export interface SendEmailResult {
  id: string
}

/**
 * Returns true when Mailgun credentials are configured and outbound email can be sent.
 */
export function isEmailEnabled(): boolean {
  return env.mailgunEnabled
}

/**
 * Resolves the Mailgun API host (US vs EU region).
 */
function mailgunApiBase(): string {
  return env.MAILGUN_EU_REGION
    ? 'https://api.eu.mailgun.net'
    : 'https://api.mailgun.net'
}

/**
 * Builds the Mailgun Messages API form body with production deliverability defaults.
 */
function buildMailgunForm(input: SendEmailInput): URLSearchParams {
  const body = new URLSearchParams({
    from: env.MAILGUN_FROM!,
    to: input.to.trim().toLowerCase(),
    subject: input.subject,
    html: input.html,
  })

  if (input.text) body.set('text', input.text)
  if (input.tag) body.set('o:tag', input.tag)
  if (env.MAILGUN_REPLY_TO) body.set('h:Reply-To', env.MAILGUN_REPLY_TO)

  // Transactional: disable tracking pixels/links — improves inbox placement.
  body.set('o:tracking', 'no')
  body.set('o:tracking-clicks', 'no')
  body.set('o:tracking-opens', 'no')

  if (input.listUnsubscribeMailto) {
    body.set('h:List-Unsubscribe', `<mailto:${input.listUnsubscribeMailto}>`)
    body.set('h:List-Unsubscribe-Post', 'List-Unsubscribe=One-Click')
  }

  if (input.deliveryTime) {
    body.set('o:deliverytime', input.deliveryTime.toUTCString().replace('GMT', '+0000'))
  }

  return body
}

/**
 * POSTs once to Mailgun with an abort timeout.
 */
async function mailgunPostOnce(form: URLSearchParams): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), MAILGUN_TIMEOUT_MS)

  try {
    return await fetch(`${mailgunApiBase()}/v3/${env.MAILGUN_DOMAIN}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${env.MAILGUN_API_KEY}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Sends a single email through Mailgun with one retry on transient 5xx errors.
 */
async function mailgunPost(form: URLSearchParams): Promise<SendEmailResult> {
  let lastError = 'Mailgun request failed'

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await mailgunPostOnce(form)

    if (res.ok) {
      const data = (await res.json()) as { id?: string }
      return { id: data.id ?? 'unknown' }
    }

    const detail = await res.text()
    lastError = `Mailgun ${res.status}: ${detail}`

    if (!RETRYABLE_STATUS.has(res.status) || attempt === 1) {
      throw new Error(lastError)
    }

    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
  }

  throw new Error(lastError)
}

/**
 * Sends a single transactional email through the Mailgun Messages API.
 * Returns null when Mailgun is not configured (dev/local without keys).
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult | null> {
  if (!env.mailgunEnabled) {
    console.warn('[email] Mailgun not configured — skipped:', input.subject)
    return null
  }

  const form = buildMailgunForm(input)
  const result = await mailgunPost(form)

  if (process.env.NODE_ENV !== 'production') {
    console.info('[email] sent', input.tag ?? 'mail', '→', form.get('to'), result.id)
  }

  return result
}
