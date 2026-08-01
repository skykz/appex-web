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
  /**
   * Billing frequency copy from Stripe, e.g. "every 4 weeks". Null when it could
   * not be resolved — the email then omits it rather than implying a cadence.
   *
   * Stating it matters: the paywall sells a "1 Week" plan that actually bills on
   * the 4-week price, so an amount with no frequency reads as a weekly charge.
   */
  cadence?: string | null
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
  const cadence = input.cadence?.trim() || null

  // Spell out amount, date and frequency in one sentence. "You'll be charged
  // automatically" alone left customers on the 1-week plan expecting a weekly
  // charge at the weekly price, when the real one is $38.95 every 4 weeks.
  const chargeSentence = cadence
    ? `Your card will be charged ${priceLabel} on ${renewalLabel}, and ${cadence} after that.`
    : `Your card will be charged ${priceLabel} on ${renewalLabel}.`

  const bodyHtml = `
    <p style="margin:0 0 10px;font-size:16px;font-weight:500;color:#111111;">Hi ${escapeHtml(input.firstName)},</p>
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.7;">${copy.intro}</p>
    ${renderRenewalRemindBox(renewalLabel, priceLabel, cadence)}
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.7;">
      ${escapeHtml(chargeSentence)} To cancel or manage your subscription, go to your account settings anytime.
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
    ...(cadence ? [`Billing cycle: ${cadence}`] : []),
    '',
    `${chargeSentence} To cancel or manage your subscription, go to your account settings anytime.`,
    settingsUrl,
    '',
    copy.progressLine,
    dashboardUrl,
    '',
    `Contact support: ${help}`,
  ].join('\n')

  return { subject: copy.subject, html, text }
}
