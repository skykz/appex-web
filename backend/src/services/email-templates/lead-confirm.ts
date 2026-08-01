import {
  EMAIL_THEME,
  escapeHtml,
  renderCompactCtaButton,
  renderDivider,
  renderEmailLayout,
  renderTextLink,
  supportEmail,
} from './layout.js'
import { env } from '../../config/env.js'

/**
 * Renders the lead double-opt-in email: "confirm your address to start getting
 * tips and updates".
 *
 * Deliberately promises nothing that needs to exist yet — the value sits behind
 * the click, so this ships without a lead-magnet asset. When a guidebook exists,
 * deliver it AFTER confirmation rather than promising it here.
 *
 * This is the only mail we send to someone with no account, so it is marketing
 * rather than transactional: the caller must attach List-Unsubscribe, and the
 * footer must state why the address was used (CAN-SPAM).
 */
export function renderLeadConfirmEmail(args: {
  firstName: string
  confirmUrl: string
}): { subject: string; html: string; text: string } {
  const help = supportEmail()
  const company = env.MAILGUN_COMPANY_NAME
  const address = env.MAILGUN_PHYSICAL_ADDRESS
  const name = args.firstName.trim()

  // Headline stays impersonal and the name goes in the body as "Hi, X 👋" —
  // that is the house style every existing template uses (see welcome.ts). Only
  // the subject is personalised, as in reengagement.ts.
  const subject = name ? `${name}, one tap and you're in` : "One tap and you're in"

  const bodyHtml = `
    ${name ? `<p style="margin:0 0 10px;font-size:16px;font-weight:500;color:${EMAIL_THEME.black};">Hi, ${escapeHtml(name)} 👋</p>` : ''}
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.7;">
      You just did the hard part — you showed up. Most people never get that far.
    </p>
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.7;">
      Confirm below and we'll start sending you the practical stuff: how people actually get
      paid for AI work, what to charge, and the first thing to do this week.
      <strong style="color:${EMAIL_THEME.black};">No fluff, no 40-page PDFs.</strong>
    </p>
    ${renderCompactCtaButton('Confirm my email', args.confirmUrl)}
    <p style="margin:20px 0 0;font-size:13px;color:#888888;line-height:1.6;">
      The link works for 7 days. If this wasn't you, just ignore it — nothing happens.
    </p>
    ${renderDivider()}
    <p style="margin:0;text-align:center;font-size:14px;color:#555555;line-height:1.7;">
      Questions? ${renderTextLink('Contact support', `mailto:${help}`)}
    </p>
  `

  // Reason line is specific: this address came from the quiz, not an account.
  const footerHtml = `
    <p style="margin:0 0 2px;font-size:12px;line-height:1.6;color:#aaaaaa;">You're receiving this because you entered your email in the Appex quiz.</p>
    <p style="margin:0 0 2px;font-size:12px;line-height:1.6;color:#aaaaaa;">Questions? ${escapeHtml(help)}</p>
    ${company ? `<p style="margin:0;font-size:12px;line-height:1.6;color:#aaaaaa;">${escapeHtml(company)}${address ? ` · ${escapeHtml(address)}` : ''}</p>` : ''}
  `

  const html = renderEmailLayout({
    // Impersonal, like every other template — renderEmailLayout escapes it.
    headline: "You're almost in",
    bodyHtml,
    footerReason: '',
    footerHtml,
  })

  // Plain-text part must say the same thing as the HTML: a mismatch between the
  // two is a classic spam signal, besides being confusing for text-only clients.
  const text = [
    subject,
    '',
    ...(name ? [`Hi, ${name} 👋`, ''] : []),
    "You just did the hard part — you showed up. Most people never get that far.",
    '',
    "Confirm below and we'll start sending you the practical stuff: how people actually get paid for AI work, what to charge, and the first thing to do this week. No fluff, no 40-page PDFs.",
    '',
    `Confirm my email: ${args.confirmUrl}`,
    '',
    "The link works for 7 days. If this wasn't you, just ignore it — nothing happens.",
    '',
    `Questions? Contact support: ${help}`,
    '',
    "You're receiving this because you entered your email in the Appex quiz.",
    ...(company ? [address ? `${company} · ${address}` : company] : []),
  ].join('\n')

  return { subject, html, text }
}
