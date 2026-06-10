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
 * Renders E1 — sent after successful payment with a one-click magic link when available.
 */
export function renderPaymentSuccessEmail(accessUrl?: string): {
  subject: string
  html: string
  text: string
} {
  const loginUrl = accessUrl ?? appUrl('/auth?tab=signin')
  const ctaLabel = accessUrl ? 'Access your account' : 'Log in now'
  const subject = 'Successful payment. Your account is ready.'

  const bodyHtml = `
    <p style="margin:0 0 6px;font-size:17px;font-weight:700;color:#111111;">Welcome checklist 👋</p>
    <p style="margin:0 0 22px;font-size:15px;color:#374151;">Complete these steps to get the most out of Appex</p>
    ${renderChecklistItem('done', 'Payment complete')}
    ${renderChecklistItem('active', 'Access your account')}
    ${renderChecklistItem('pending', 'Finish 1st lesson')}
    ${renderCtaButton(ctaLabel, loginUrl)}
    ${renderDivider()}
    <p style="margin:0 0 16px;font-size:17px;font-weight:700;color:#111111;text-align:center;">Why log in now?</p>
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
    ${renderCtaButton(ctaLabel, loginUrl)}
    <p style="margin:24px 0 0;text-align:center;font-size:14px;color:#6B7280;">
      Need help? <a href="mailto:${supportEmail()}" style="color:#FF6B00;font-weight:600;text-decoration:none;">Contact support</a>
    </p>
  `

  const html = renderEmailLayout({
    headline: "Let's get started",
    bodyHtml,
    footerReason: "You're receiving this because you purchased a plan at Appex.",
  })

  const text = [
    'Successful payment. Your account is ready.',
    '',
    'Welcome checklist 👋',
    'Complete these steps to get the most out of Appex',
    '',
    '✓ Payment complete (done)',
    '● Access your account',
    '○ Finish 1st lesson',
    '',
    `${ctaLabel}: ${loginUrl}`,
    '',
    'Why log in now?',
    '📚 Learn AI skills — Step-by-step lessons with real workflows',
    '🤖 Use Claude today — Prompting, content, client work — now',
    '💼 Build real projects — Portfolio-ready workflows to sell',
    '📊 See your growth — Progress tracking and certificates',
    '',
    `${ctaLabel}: ${loginUrl}`,
  ].join('\n')

  return { subject, html, text }
}
