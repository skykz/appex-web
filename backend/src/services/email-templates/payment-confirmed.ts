import {
  appUrl,
  escapeHtml,
  formatRenewalDate,
  formatUsd,
  planDisplayLabel,
  renderCtaButton,
  renderDivider,
  renderEmailLayout,
  renderReceiptBox,
  renderSuccessBadge,
  renderTextLink,
  supportEmail,
} from './layout.js'

/**
 * Renders E7 — subscription renewal receipt (aligned with appex_email_7_payment_confirmed.html).
 */
export function renderPaymentConfirmedEmail(args: {
  firstName: string
  planLabel: string
  paidDateIso: string
  nextRenewalIso: string
  amount: number
  currency?: string
}): { subject: string; html: string; text: string } {
  const help = supportEmail()
  const learnUrl = appUrl('/')
  const settingsUrl = appUrl('/settings?section=plan')
  const subject = 'Your subscription just renewed ✓'
  const paidDateLabel = formatRenewalDate(args.paidDateIso)
  const nextRenewalLabel = formatRenewalDate(args.nextRenewalIso)
  const amountLabel = formatUsd(args.amount, args.currency ?? 'usd')

  const bodyHtml = `
    <p style="margin:0 0 10px;font-size:16px;font-weight:500;color:#111111;">Hi ${escapeHtml(args.firstName)},</p>
    ${renderSuccessBadge('Payment successful')}
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.7;">
      Your Appex subscription has been renewed. Here's your receipt:
    </p>
    ${renderReceiptBox([
      { label: 'Plan', value: args.planLabel },
      { label: 'Date', value: paidDateLabel },
      { label: 'Next renewal', value: nextRenewalLabel },
      { label: 'Amount charged', value: amountLabel },
    ])}
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.7;">
      Your access continues without interruption. Keep going — you're building real AI skills.
    </p>
    ${renderCtaButton('Continue learning →', learnUrl)}
    ${renderDivider()}
    <p style="margin:0;font-size:14px;color:#555555;line-height:1.7;text-align:center;">
      To manage your subscription, go to ${renderTextLink('account settings', settingsUrl)}
    </p>
  `

  const footerHtml = `
    <p style="margin:0 0 2px;font-size:12px;line-height:1.6;color:#aaaaaa;">You're receiving this because you have an active Appex subscription.</p>
    <p style="margin:0;font-size:12px;line-height:1.6;color:#aaaaaa;">Questions? ${escapeHtml(help)}</p>
  `

  const html = renderEmailLayout({
    headline: 'Payment confirmed',
    bodyHtml,
    footerReason: '',
    footerHtml,
  })

  const text = [
    subject,
    '',
    `Hi ${args.firstName},`,
    '',
    'Payment successful.',
    '',
    'Your Appex subscription has been renewed. Receipt:',
    `Plan: ${args.planLabel}`,
    `Date: ${paidDateLabel}`,
    `Next renewal: ${nextRenewalLabel}`,
    `Amount charged: ${amountLabel}`,
    '',
    "Your access continues without interruption. Keep going — you're building real AI skills.",
    '',
    `Continue learning: ${learnUrl}`,
    '',
    `Manage subscription: ${settingsUrl}`,
    '',
    "You're receiving this because you have an active Appex subscription.",
    `Questions? ${help}`,
  ].join('\n')

  return { subject, html, text }
}

/**
 * Maps a stored billing interval to the short receipt label shown in E7.
 */
export function planLabelFromBillingInterval(
  interval: 'day_1' | 'week_1' | 'week_4' | 'week_12' | 'year' | null | undefined,
  planName?: string | null
): string {
  return planDisplayLabel(interval, planName?.trim() || 'Premium')
}
