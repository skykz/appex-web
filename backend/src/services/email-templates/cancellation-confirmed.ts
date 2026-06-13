import {
  escapeHtml,
  formatRenewalDate,
  renderContentInfoBox,
  renderDivider,
  renderEmailLayout,
  renderOutlineButton,
  supportEmail,
} from './layout.js'

/**
 * Renders E4 — cancellation confirmation (aligned with appex_email_4_cancellation.html).
 */
export function renderCancellationConfirmedEmail(args: {
  firstName: string
  accessUntilIso: string
}): { subject: string; html: string; text: string } {
  const accessUntilLabel = formatRenewalDate(args.accessUntilIso)
  const help = supportEmail()
  const subject = 'Your Appex subscription has been cancelled'
  const endDateHtml = `<strong>${escapeHtml(accessUntilLabel)}</strong>`

  const bodyHtml = `
    <p style="margin:0 0 10px;font-size:16px;font-weight:500;color:#111111;">Hello, ${escapeHtml(args.firstName)}!</p>
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.7;">
      This email confirms that you have cancelled your Appex subscription which will end on ${endDateHtml}.
      We're really sorry to see you go, but thanks for giving us a try.
    </p>
    ${renderContentInfoBox(
      "You won't be charged again",
      `You will continue to have access to your plan until the end of your current billing cycle on ${endDateHtml}. After that, you will no longer be billed.`
    )}
    ${renderContentInfoBox(
      "We'd love to welcome you back!",
      'Remember, our door is always open. If your circumstances change or you wish to explore Appex again, reactivating your subscription is straightforward and hassle-free.'
    )}
    ${renderDivider()}
    <p style="margin:0 0 12px;font-size:14px;font-weight:500;color:#111111;">Need help?</p>
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.7;">If you have any questions, please contact us here</p>
    ${renderOutlineButton('Contact support', `mailto:${help}`)}
  `

  const footerHtml = `
    <p style="margin:0 0 2px;font-size:12px;line-height:1.6;color:#aaaaaa;">Please do not reply to this email. This mailbox is not monitored.</p>
    <p style="margin:0 0 2px;font-size:12px;line-height:1.6;color:#aaaaaa;">If you have questions, contact us at ${escapeHtml(help)}</p>
    <p style="margin:4px 0 0;font-size:12px;line-height:1.6;color:#aaaaaa;">Appex Inc. · 131 Continental Dr, Suite 305, Newark, DE 19713</p>
  `

  const html = renderEmailLayout({
    headline: 'Your account has been cancelled.',
    headlineHtml: `${escapeHtml('Your account has been cancelled.')}<br />${escapeHtml('We are sad to see you go.')}`,
    bodyHtml,
    footerReason: '',
    footerHtml,
  })

  const text = [
    subject,
    '',
    `Hello, ${args.firstName}!`,
    '',
    `This email confirms that you have cancelled your Appex subscription which will end on ${accessUntilLabel}.`,
    "We're really sorry to see you go, but thanks for giving us a try.",
    '',
    "You won't be charged again.",
    `You will continue to have access until ${accessUntilLabel}. After that, you will no longer be billed.`,
    '',
    "We'd love to welcome you back! Reactivating your subscription is straightforward and hassle-free.",
    '',
    'Need help?',
    `Contact support: ${help}`,
    '',
    'Please do not reply to this email. This mailbox is not monitored.',
    'Appex Inc. · 131 Continental Dr, Suite 305, Newark, DE 19713',
  ].join('\n')

  return { subject, html, text }
}
