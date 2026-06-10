import {
  appUrl,
  renderCtaButton,
  renderEmailLayout,
  renderOutlineButton,
  supportEmail,
} from './layout.js'

/**
 * Renders email sent when a renewal payment fails (first attempt — retry pending).
 */
export function renderPaymentFailedNoticeEmail(args: {
  firstName: string
}): { subject: string; html: string; text: string } {
  const settingsUrl = appUrl('/settings?section=plan')
  const subject = 'Action needed: payment failed'

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;color:#111111;">Hi ${escapeName(args.firstName)},</p>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;">
      We couldn't process your latest Appex renewal payment. We'll retry once automatically.
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">
      You still have full access for the next 24 hours. Update your payment method now to avoid losing access.
    </p>
    ${renderOutlineButton('Update payment method', settingsUrl)}
    ${renderCtaButton('Go to account settings', settingsUrl)}
    <p style="margin:24px 0 0;text-align:center;font-size:14px;color:#6B7280;">
      Need help? <a href="mailto:${supportEmail()}" style="color:#FF6B00;font-weight:600;text-decoration:none;">Contact support</a>
    </p>
  `

  const html = renderEmailLayout({
    headline: 'Payment failed',
    bodyHtml,
    footerReason: "You're receiving this because a renewal payment for your Appex subscription failed.",
  })

  const text = [
    `Hi ${args.firstName},`,
    '',
    "We couldn't process your latest Appex renewal payment. We'll retry once automatically.",
    '',
    'You still have full access for the next 24 hours. Update your payment method:',
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
