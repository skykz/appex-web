import {
  appUrl,
  EMAIL_THEME,
  escapeHtml,
  renderCtaButton,
  renderDivider,
  renderEmailLayout,
  renderGhostLink,
  renderTextLink,
  supportEmail,
} from './layout.js'

export interface WelcomeEmailInput {
  firstName: string
  email: string
}

/**
 * Renders E2 — welcome email scheduled ~1 minute after E1 (aligned with appex_email_2_white.html).
 */
export function renderWelcomeEmail(input: WelcomeEmailInput): {
  subject: string
  html: string
  text: string
} {
  const loginUrl = appUrl('/auth?tab=signin')
  const resetUrl = appUrl('/auth/forgot-password')
  const help = supportEmail()
  const subject = 'Welcome to Appex!'

  const bodyHtml = `
    <p style="margin:0 0 10px;font-size:16px;font-weight:500;color:${EMAIL_THEME.black};">Hi, ${escapeName(input.firstName)} 👋</p>
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.7;">We're super excited to have you here!</p>
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.7;">
      Your plan is ready. You now have access to your personalized AI skill roadmap,
      step-by-step lessons, and real income workflows.
    </p>
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.7;">Just log in to get started:</p>
    ${renderCtaButton('Log in', loginUrl)}
    ${renderGhostLink('Forgot password?', resetUrl)}
    ${renderDivider()}
    <p style="margin:0 0 4px;font-size:14px;color:#555555;line-height:1.7;">Make sure to use the email you signed up with:</p>
    <p style="margin:6px 0 20px;font-size:14px;font-weight:500;color:${EMAIL_THEME.orange};">${escapeHtml(input.email)}</p>
    <p style="margin:0;text-align:center;font-size:14px;color:#555555;line-height:1.7;">
      Any issues? ${renderTextLink('Contact support', `mailto:${help}`)}
    </p>
  `

  const html = renderEmailLayout({
    headline: 'Welcome to Appex',
    bodyHtml,
    footerReason: "You're receiving this because you created an account at Appex.",
  })

  const text = [
    subject,
    '',
    `Hi, ${input.firstName} 👋`,
    '',
    "We're super excited to have you here!",
    '',
    'Your plan is ready. You now have access to your personalized AI skill roadmap, step-by-step lessons, and real income workflows.',
    '',
    `Log in: ${loginUrl}`,
    `Forgot password: ${resetUrl}`,
    '',
    `Sign-up email: ${input.email}`,
    '',
    `Contact support: ${help}`,
  ].join('\n')

  return { subject, html, text }
}

/**
 * Escapes a display name for HTML email bodies.
 */
function escapeName(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
