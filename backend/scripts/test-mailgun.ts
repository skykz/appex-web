/**
 * Sends one test email through Mailgun using backend/.env settings.
 * Use this after verifying a custom domain (not sandbox) in Mailgun.
 *
 * Usage:
 *   npx tsx backend/scripts/test-mailgun.ts you@example.com
 */
import 'dotenv/config'
import { env } from '../src/config/env.js'
import { sendEmail } from '../src/services/email.service.js'

const to = process.argv[2]?.trim().toLowerCase()

/**
 * Validates CLI input and required Mailgun env vars before sending.
 */
function assertReady(): void {
  if (!to || !to.includes('@')) {
    console.error('Usage: npx tsx backend/scripts/test-mailgun.ts <recipient@email.com>')
    process.exit(1)
  }

  if (!env.mailgunEnabled) {
    console.error(
      'Mailgun is not configured. Set MAILGUN_API_KEY, MAILGUN_DOMAIN, and MAILGUN_FROM in backend/.env'
    )
    process.exit(1)
  }

  if (env.mailgunSandbox) {
    console.warn(
      '[test-mailgun] MAILGUN_DOMAIN still looks like sandbox (*.mailgun.org). ' +
        'For real delivery, use a verified custom domain (e.g. mg.appexme.com).'
    )
  }
}

/**
 * Sends a minimal HTML test message and prints the Mailgun message id.
 */
async function main(): Promise<void> {
  assertReady()

  console.info('[test-mailgun] domain:', env.MAILGUN_DOMAIN)
  console.info('[test-mailgun] from:', env.MAILGUN_FROM)
  console.info('[test-mailgun] to:', to)

  const result = await sendEmail({
    to: to!,
    subject: 'Appex Mailgun test (production domain)',
    html: '<p>If you received this, Mailgun is working outside sandbox.</p>',
    text: 'If you received this, Mailgun is working outside sandbox.',
    tag: 'mailgun-test',
  })

  if (!result) {
    console.error('[test-mailgun] sendEmail returned null (Mailgun disabled?)')
    process.exit(1)
  }

  console.info('[test-mailgun] sent — Mailgun id:', result.id)
}

main().catch((err) => {
  console.error('[test-mailgun] failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
