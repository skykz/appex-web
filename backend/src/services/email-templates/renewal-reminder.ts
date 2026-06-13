import {
  appUrl,
  escapeHtml,
  formatRenewalDate,
  formatUsd,
  renderCtaButton,
  renderDivider,
  renderEmailLayout,
  renderOutlineButton,
  renderRenewalRemindBox,
  renderTextLink,
  supportEmail,
} from './layout.js'

export type RenewalReminderVariant = '3d' | '24h'

export interface RenewalReminderEmailInput {
  firstName: string
  renewalDateIso: string
  amount: number
  currency?: string
  /** E3 = 3 days before renewal; E5 = 24 hours before renewal. */
  variant: RenewalReminderVariant
}

const COPY: Record<
  RenewalReminderVariant,
  {
    subject: string
    headline: string
    intro: string
    progressLine: string
  }
> = {
  '3d': {
    subject: 'Your Appex access renews in 3 days',
    headline: 'Your subscription renews in 3 days',
    intro: 'Just a heads up — your Appex subscription renews soon.',
    progressLine: "Otherwise, keep going — you're building real AI skills.",
  },
  '24h': {
    subject: 'Your Appex access renews tomorrow',
    headline: 'Your subscription renews tomorrow',
    intro: 'Just a reminder — your Appex subscription renews in less than 24 hours.',
    progressLine: "Otherwise, keep going — you're making real progress.",
  },
}

/**
 * Renders E3 (3-day) or E5 (24-hour) renewal reminder aligned with appex_email_3 / appex_email_5 mocks.
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
  const copy = COPY[input.variant]

  const bodyHtml = `
    <p style="margin:0 0 10px;font-size:16px;font-weight:500;color:#111111;">Hi ${escapeHtml(input.firstName)},</p>
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.7;">${copy.intro}</p>
    ${renderRenewalRemindBox(renewalLabel, priceLabel)}
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.7;">
      You'll be charged automatically. To cancel or manage your subscription, go to your account settings anytime.
    </p>
    ${renderOutlineButton('Manage subscription', settingsUrl)}
    ${renderDivider()}
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.7;">${copy.progressLine}</p>
    ${renderCtaButton('Continue learning →', dashboardUrl)}
    <p style="margin:0;text-align:center;font-size:14px;color:#555555;line-height:1.7;">
      Questions? ${renderTextLink('Contact support', `mailto:${help}`)}
    </p>
  `

  const html = renderEmailLayout({
    headline: copy.headline,
    bodyHtml,
    footerReason: "You're receiving this because you have an active Appex subscription.",
  })

  const text = [
    copy.subject,
    '',
    `Hi ${input.firstName},`,
    '',
    copy.intro,
    '',
    `Renewal date: ${renewalLabel}`,
    `Amount: ${priceLabel}`,
    '',
    "You'll be charged automatically. To cancel or manage your subscription, go to your account settings anytime.",
    settingsUrl,
    '',
    copy.progressLine,
    dashboardUrl,
    '',
    `Contact support: ${help}`,
  ].join('\n')

  return { subject: copy.subject, html, text }
}
