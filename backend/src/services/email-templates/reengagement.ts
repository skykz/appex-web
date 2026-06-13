import {
  appUrl,
  escapeHtml,
  renderCtaButton,
  renderDivider,
  renderEmailLayout,
  renderReengagementRobot,
  renderTextLink,
  supportEmail,
} from './layout.js'

/**
 * Renders E6 — reengagement for inactive subscribers (aligned with appex_email_6_reengagement.html).
 */
export function renderReengagementEmail(args: {
  firstName: string
}): { subject: string; html: string; text: string } {
  const help = supportEmail()
  const learnUrl = appUrl('/')
  const subject = `${args.firstName}, I know you didn't forget about your progress`

  const bodyHtml = `
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.7;text-align:center;">
      Ready to keep going with your AI skills plan?
    </p>
    ${renderReengagementRobot()}
    ${renderCtaButton('Continue learning', learnUrl)}
    ${renderDivider()}
    <p style="margin:0;font-size:14px;color:#555555;line-height:1.7;text-align:center;">
      Questions? ${renderTextLink('Contact our support team', `mailto:${help}`)}
    </p>
  `

  const footerHtml = `
    <p style="margin:0 0 2px;font-size:12px;line-height:1.6;color:#aaaaaa;">You're receiving this because you created an account at Appex.</p>
    <p style="margin:0;font-size:12px;line-height:1.6;color:#aaaaaa;">Questions? ${escapeHtml(help)}</p>
  `

  const html = renderEmailLayout({
    headline: 'Still here. Ready when you are.',
    bodyHtml,
    footerReason: '',
    footerHtml,
  })

  const text = [
    subject,
    '',
    'Still here. Ready when you are.',
    '',
    'Ready to keep going with your AI skills plan?',
    '',
    `Continue learning: ${learnUrl}`,
    '',
    `Questions? Contact support: ${help}`,
    '',
    "You're receiving this because you created an account at Appex.",
  ].join('\n')

  return { subject, html, text }
}
