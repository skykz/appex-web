import {
  appUrl,
  renderChecklistItem,
  renderCtaButton,
  renderDivider,
  renderEmailLayout,
  renderFeatureCardGrid,
  supportEmail,
} from './layout.js'

/**
 * Renders E1 — sent after successful payment (aligned with appex_email_1_white.html).
 */
export function renderPaymentSuccessEmail(accessUrl?: string): {
  subject: string
  html: string
  text: string
} {
  const loginUrl = accessUrl ?? appUrl('/auth?tab=signin')
  const subject = 'Successful payment. Account is ready.'
  const help = supportEmail()

  const bodyHtml = `
    <p style="margin:0 0 10px;font-size:16px;font-weight:500;color:#111111;">Welcome checklist 👋</p>
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.7;">Complete these steps to get the most out of Appex</p>
    ${renderChecklistItem('done', 'Complete sign-up')}
    ${renderChecklistItem('active', 'Log in')}
    ${renderChecklistItem('pending', 'Finish 1st lesson')}
    ${renderCtaButton('Log in now', loginUrl)}
    ${renderDivider()}
    <p style="margin:0 0 14px;font-size:14px;font-weight:500;color:#111111;">Why log in now?</p>
    ${renderFeatureCardGrid([
      {
        icon: '📚',
        title: 'Learn AI skills',
        description: 'Step-by-step lessons with real workflows',
      },
      {
        icon: '🤖',
        title: 'Use Claude today',
        description: 'Prompting, content, client work — now',
      },
      {
        icon: '💼',
        title: 'Build real projects',
        description: 'Portfolio-ready workflows to sell',
      },
      {
        icon: '📊',
        title: 'See your growth',
        description: 'Progress tracking and certificates',
      },
    ])}
    ${renderCtaButton('Log in now', loginUrl)}
    <p style="margin:0;text-align:center;font-size:14px;color:#555555;line-height:1.7;">
      Need help? <a href="mailto:${help}" style="color:#FF6B00;text-decoration:none;">Contact support</a>
    </p>
  `

  const html = renderEmailLayout({
    headline: "Let's get started",
    bodyHtml,
    footerReason: "You're receiving this because you created an account at Appex.",
  })

  const text = [
    subject,
    '',
    "Let's get started",
    '',
    'Welcome checklist 👋',
    'Complete these steps to get the most out of Appex',
    '',
    '✓ Complete sign-up',
    '● Log in',
    '○ Finish 1st lesson',
    '',
    `Log in now: ${loginUrl}`,
    '',
    'Why log in now?',
    '📚 Learn AI skills — Step-by-step lessons with real workflows',
    '🤖 Use Claude today — Prompting, content, client work — now',
    '💼 Build real projects — Portfolio-ready workflows to sell',
    '📊 See your growth — Progress tracking and certificates',
    '',
    `Log in now: ${loginUrl}`,
    '',
    `Contact support: ${help}`,
  ].join('\n')

  return { subject, html, text }
}
