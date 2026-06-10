import {
  appUrl,
  renderCtaButton,
  renderEmailLayout,
  supportEmail,
} from './layout.js'

/**
 * Renders email sent when a cancelled subscription reaches its end date and access is revoked.
 */
export function renderSubscriptionExpiredEmail(args: {
  firstName: string
}): { subject: string; html: string; text: string } {
  const plansUrl = appUrl('/settings?section=plan')
  const subject = 'Your access has ended'

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;color:#111111;">Hi ${escapeName(args.firstName)},</p>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;">
      Your Appex subscription period has ended and premium content is no longer available on your account.
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">
      Ready to pick up where you left off? Resubscribe anytime to restore full access.
    </p>
    ${renderCtaButton('Resubscribe', plansUrl)}
    <p style="margin:24px 0 0;text-align:center;font-size:14px;color:#6B7280;">
      Questions? <a href="mailto:${supportEmail()}" style="color:#FF6B00;font-weight:600;text-decoration:none;">Contact support</a>
    </p>
  `

  const html = renderEmailLayout({
    headline: 'Your access has ended',
    bodyHtml,
    footerReason: "You're receiving this because your Appex subscription period ended.",
  })

  const text = [
    `Hi ${args.firstName},`,
    '',
    'Your Appex subscription period has ended and premium content is no longer available.',
    '',
    'Resubscribe anytime:',
    plansUrl,
    '',
    `Questions? ${supportEmail()}`,
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
