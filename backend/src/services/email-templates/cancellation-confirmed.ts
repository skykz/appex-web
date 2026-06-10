import {
  appUrl,
  formatRenewalDate,
  renderCtaButton,
  renderEmailLayout,
  renderInfoBox,
  supportEmail,
} from './layout.js'

/**
 * Renders email sent immediately after the user confirms subscription cancellation.
 */
export function renderCancellationConfirmedEmail(args: {
  firstName: string
  accessUntilIso: string
}): { subject: string; html: string; text: string } {
  const accessUntilLabel = formatRenewalDate(args.accessUntilIso)
  const settingsUrl = appUrl('/settings?section=plan')
  const subject = 'Your subscription cancellation is confirmed'

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;color:#111111;">Hi ${escapeName(args.firstName)},</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">
      We've received your cancellation request. You won't be charged again unless you resubscribe.
    </p>
    ${renderInfoBox([{ label: 'Access until', value: accessUntilLabel }])}
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">
      You can keep learning until that date. Changed your mind? You can resume your subscription anytime before then.
    </p>
    ${renderCtaButton('Manage subscription', settingsUrl)}
    <p style="margin:24px 0 0;text-align:center;font-size:14px;color:#6B7280;">
      Need help? <a href="mailto:${supportEmail()}" style="color:#FF6B00;font-weight:600;text-decoration:none;">Contact support</a>
    </p>
  `

  const html = renderEmailLayout({
    headline: 'Cancellation confirmed',
    bodyHtml,
    footerReason: "You're receiving this because you cancelled your Appex subscription.",
  })

  const text = [
    `Hi ${args.firstName},`,
    '',
    "We've received your cancellation request. You won't be charged again unless you resubscribe.",
    '',
    `Access until: ${accessUntilLabel}`,
    '',
    'You can keep learning until that date. Resume anytime before then:',
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
