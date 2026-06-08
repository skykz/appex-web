import {
  appUrl,
  EMAIL_THEME,
  renderCtaButton,
  renderDivider,
  renderEmailHighlight,
  renderEmailLayout,
  renderTextLink,
  supportEmail,
} from './layout.js'

export interface WelcomeEmailInput {
  firstName: string
  email: string
}

/**
 * Renders E2 — welcome email scheduled ~1 minute after E1.
 */
export function renderWelcomeEmail(input: WelcomeEmailInput): {
  subject: string
  html: string
  text: string
} {
  const loginUrl = appUrl('/auth?tab=signin')
  const resetUrl = appUrl('/auth/forgot-password')
  const help = supportEmail()
  const subject = `Welcome to Appex, ${input.firstName} 👋`

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;color:${EMAIL_THEME.black};">Hi, ${escapeName(input.firstName)} 👋</p>
    <p style="margin:0 0 16px;">We're super excited to have you here!</p>
    <p style="margin:0 0 20px;">
      Your plan is ready. You now have access to your personalized AI skill roadmap,
      step-by-step lessons, and real income workflows.
    </p>
    <p style="margin:0 0 8px;">Just log in to get started:</p>
    ${renderCtaButton('Log in', loginUrl)}
    <p style="margin:14px 0 0;text-align:center;font-size:14px;color:${EMAIL_THEME.muted};">
      Forgot password? ${renderTextLink('Reset it here', resetUrl)}
    </p>
    ${renderDivider()}
    <p style="margin:0 0 12px;font-size:14px;color:${EMAIL_THEME.muted};text-align:center;">
      Make sure to use the email you signed up with:
    </p>
    ${renderEmailHighlight(input.email)}
    <p style="margin:20px 0 0;text-align:center;font-size:14px;color:${EMAIL_THEME.muted};">
      Any issues? ${renderTextLink('Contact support', `mailto:${help}`)}
    </p>
  `

  const html = renderEmailLayout({
    headline: 'Welcome to Appex',
    bodyHtml,
    footerReason: "You're receiving this because you created an account at Appex.",
  })

  const text = [
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
