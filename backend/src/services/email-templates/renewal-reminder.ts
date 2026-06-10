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
  /** Human-readable lead time shown in the subject/body, e.g. "3 days" or "24 hours". */
  leadTimeLabel: string
}

/**
 * Renders E3/E4 — renewal reminder before the next Stripe charge (3 days or 24 hours).
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
  const subject = `Your Appex access renews in ${input.leadTimeLabel}`

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;color:${EMAIL_THEME.black};">Hi ${escapeName(input.firstName)},</p>
    <p style="margin:0 0 20px;">Just a heads up — your Appex subscription renews in ${input.leadTimeLabel}.</p>
    ${renderInfoBox([
      { label: '📅 Renewal date', value: renewalLabel },
      { label: '💳 Renewal amount', value: priceLabel },
    ])}
    <p style="margin:0 0 4px;">
      You'll be charged automatically at the full renewal price. To cancel, do so at least 24 hours before your renewal date in account settings.
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
    headline: `Your subscription renews in ${input.leadTimeLabel}`,
    bodyHtml,
    footerReason: "You're receiving this because you have an active Appex subscription.",
  })

  const text = [
    `Hi ${input.firstName},`,
    '',
    `Just a heads up — your Appex subscription renews in ${input.leadTimeLabel}.`,
    '',
    `Renewal date: ${renewalLabel}`,
    `Renewal amount: ${priceLabel}`,
    '',
    "You'll be charged automatically at the full renewal price. Cancel at least 24 hours before renewal:",
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
