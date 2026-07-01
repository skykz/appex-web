import {
  EMAIL_THEME,
  escapeHtml,
  renderCtaButton,
  renderEmailLayout,
  renderTextLink,
  supportEmail,
} from './layout.js'

export interface PasswordResetEmailInput {
  firstName?: string
  resetUrl: string
}

/**
 * Renders the branded password-reset email sent via Mailgun (replaces Supabase default).
 */
export function renderPasswordResetEmail(input: PasswordResetEmailInput): {
  subject: string
  html: string
  text: string
} {
  const help = supportEmail()
  const greeting = input.firstName?.trim() ? escapeHtml(input.firstName.trim()) : 'there'
  const subject = 'Reset your Appex password'

  const bodyHtml = `
    <p style="margin:0 0 10px;font-size:16px;font-weight:500;color:${EMAIL_THEME.black};">Hi ${greeting},</p>
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.7;">
      We received a request to reset your Appex password. Click the button below to choose a new one.
    </p>
    ${renderCtaButton('Reset password', input.resetUrl)}
    <p style="margin:0 0 20px;font-size:13px;color:#888888;line-height:1.6;text-align:center;">
      This link expires soon. If it stops working, request a new reset from the sign-in page.
    </p>
    <p style="margin:0;font-size:14px;color:#555555;line-height:1.7;">
      Didn't ask for this? You can safely ignore this email — your password won't change.
      Questions? ${renderTextLink('Contact support', `mailto:${help}`)}
    </p>
  `

  const html = renderEmailLayout({
    headline: 'Reset your password',
    bodyHtml,
    footerReason: "You're receiving this because a password reset was requested for your Appex account.",
  })

  const text = [
    subject,
    '',
    `Hi ${input.firstName?.trim() || 'there'},`,
    '',
    'We received a request to reset your Appex password. Open this link to choose a new one:',
    input.resetUrl,
    '',
    "This link expires soon. If it stops working, request a new reset from the sign-in page.",
    '',
    "Didn't ask for this? You can safely ignore this email — your password won't change.",
    '',
    `Contact support: ${help}`,
  ].join('\n')

  return { subject, html, text }
}
