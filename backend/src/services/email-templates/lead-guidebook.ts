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
 * Renders the lead-magnet email: the "AI Agents Guidebook" promised on the quiz
 * email step.
 *
 * This is the only mail we send to someone who has no account, so it is marketing
 * rather than transactional: the caller must attach List-Unsubscribe, and the
 * footer states why the address was used (CAN-SPAM).
 *
 * The download URL is required by the signature rather than read here so the
 * caller cannot accidentally render a guidebook email with no guidebook in it.
 */
export function renderLeadGuidebookEmail(args: {
  firstName: string
  guidebookUrl: string
}): { subject: string; html: string; text: string } {
  const help = supportEmail()
  const company = env.MAILGUN_COMPANY_NAME
  const address = env.MAILGUN_PHYSICAL_ADDRESS
  const name = args.firstName.trim()
  // House style (see welcome.ts): impersonal headline, name greeted in the body,
  // subject personalised as in reengagement.ts.
  const subject = name ? `${name}, here's your guidebook` : "Here's your guidebook"

  const bodyHtml = `
    ${name ? `<p style="margin:0 0 10px;font-size:16px;font-weight:500;color:${EMAIL_THEME.black};">Hi, ${escapeHtml(name)} 👋</p>` : ''}
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.7;">
      As promised — the AI Agents Guidebook is yours.
    </p>
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.7;">
      Don't just save it for later. Read the first section today and try one thing.
      <strong style="color:${EMAIL_THEME.black};">That's the difference between knowing and earning.</strong>
    </p>
    ${renderCompactCtaButton('Get the guidebook', args.guidebookUrl)}
    ${renderDivider()}
    <p style="margin:0;text-align:center;font-size:14px;color:#555555;line-height:1.7;">
      Questions? ${renderTextLink('Contact support', `mailto:${help}`)}
    </p>
  `

  // The reason line is specific: this address came from the quiz, not an account.
  const footerHtml = `
    <p style="margin:0 0 2px;font-size:12px;line-height:1.6;color:#aaaaaa;">You're receiving this because you entered your email in the Appex quiz to get the AI Agents Guidebook.</p>
    <p style="margin:0 0 2px;font-size:12px;line-height:1.6;color:#aaaaaa;">Questions? ${escapeHtml(help)}</p>
    ${company ? `<p style="margin:0;font-size:12px;line-height:1.6;color:#aaaaaa;">${escapeHtml(company)}${address ? ` · ${escapeHtml(address)}` : ''}</p>` : ''}
  `

  const html = renderEmailLayout({
    headline: 'Your guidebook is ready',
    bodyHtml,
    footerReason: '',
    footerHtml,
  })

  // Keep the plain-text part saying the same thing as the HTML — a mismatch is a
  // spam signal and confuses text-only clients.
  const text = [
    subject,
    '',
    ...(name ? [`Hi, ${name} 👋`, ''] : []),
    'As promised — the AI Agents Guidebook is yours.',
    '',
    "Don't just save it for later. Read the first section today and try one thing. That's the difference between knowing and earning.",
    '',
    `Get the guidebook: ${args.guidebookUrl}`,
    '',
    `Questions? Contact support: ${help}`,
    '',
    "You're receiving this because you entered your email in the Appex quiz to get the AI Agents Guidebook.",
    ...(company ? [address ? `${company} · ${address}` : company] : []),
  ].join('\n')

  return { subject, html, text }
}
