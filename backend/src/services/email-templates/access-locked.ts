import {
  appUrl,
  renderCtaButton,
  renderEmailLayout,
  supportEmail,
} from './layout.js'

/**
 * Renders email sent when premium access is locked after a failed payment retry or grace expiry.
 */
export function renderAccessLockedEmail(args: {
  firstName: string
}): { subject: string; html: string; text: string } {
  const settingsUrl = appUrl('/settings?section=plan')
  const subject = 'Your AppEx access has been paused'

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;color:#111111;">Hi ${escapeName(args.firstName)},</p>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;">
      We couldn't collect your renewal payment after a retry. Your premium access is now locked.
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">
      Update your payment method or choose a plan to restore full access immediately.
    </p>
    ${renderCtaButton('Restore access', settingsUrl)}
    <p style="margin:24px 0 0;text-align:center;font-size:14px;color:#6B7280;">
      Need help? <a href="mailto:${supportEmail()}" style="color:#FF6B00;font-weight:600;text-decoration:none;">Contact support</a>
    </p>
  `

  const html = renderEmailLayout({
    headline: 'Access paused',
    bodyHtml,
    footerReason: "You're receiving this because your Appex subscription payment could not be processed.",
  })

  const text = [
    `Hi ${args.firstName},`,
    '',
    "We couldn't collect your renewal payment after a retry. Your premium access is now locked.",
    '',
    'Restore access:',
    settingsUrl,
    '',
    `Need help? ${supportEmail()}`,
  ].join('\n')

  return { subject, html, text }
}

/**
 * Escapes a display value for HTML email bodies.
 */
function escapeName(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
