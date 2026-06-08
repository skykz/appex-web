import {
  appUrl,
  EMAIL_THEME,
  formatRenewalDate,
  formatUsd,
  renderCtaButton,
  renderDivider,
  renderEmailLayout,
  renderInfoBox,
  renderOutlineButton,
  renderTextLink,
  supportEmail,
} from './layout.js'

export interface RenewalReminderEmailInput {
  firstName: string
  renewalDateIso: string
  amount: number
  currency?: string
}

/**
 * Renders E3 — renewal reminder sent 3 days before the next Stripe charge.
 */
export function renderRenewalReminderEmail(input: RenewalReminderEmailInput): {
  subject: string
  html: string
  text: string
} {
  const settingsUrl = appUrl('/settings?section=plan')
  const dashboardUrl = appUrl('/home')
  const help = supportEmail()
  const renewalLabel = formatRenewalDate(input.renewalDateIso)
  const priceLabel = formatUsd(input.amount, input.currency)
  const subject = 'Your Appex access renews in 3 days'

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;color:${EMAIL_THEME.black};">Hi ${escapeName(input.firstName)},</p>
    <p style="margin:0 0 20px;">Just a heads up — your Appex subscription renews soon.</p>
    ${renderInfoBox([
      { label: '📅 Renewal date', value: renewalLabel },
      { label: '💳 Amount', value: priceLabel },
    ])}
    <p style="margin:0 0 4px;">
      You'll be charged automatically. To cancel or manage your subscription, go to your account settings anytime.
    </p>
    ${renderOutlineButton('Manage subscription', settingsUrl)}
    ${renderDivider()}
    <p style="margin:0 0 4px;text-align:center;">Otherwise, keep going — you're building real AI skills.</p>
    ${renderCtaButton('Continue learning →', dashboardUrl)}
    <p style="margin:24px 0 0;text-align:center;font-size:14px;color:${EMAIL_THEME.muted};">
      Questions? ${renderTextLink('Contact support', `mailto:${help}`)}
    </p>
  `

  const html = renderEmailLayout({
    headline: 'Your subscription renews in 3 days',
    bodyHtml,
    footerReason: "You're receiving this because you have an active Appex subscription.",
  })

  const text = [
    `Hi ${input.firstName},`,
    '',
    'Just a heads up — your Appex subscription renews soon.',
    '',
    `Renewal date: ${renewalLabel}`,
    `Amount: ${priceLabel}`,
    '',
    "You'll be charged automatically. Manage your subscription:",
    settingsUrl,
    '',
    'Continue learning:',
    dashboardUrl,
    '',
    `Questions? ${help}`,
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
