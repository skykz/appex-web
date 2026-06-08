import { env } from '../../config/env.js'

export const EMAIL_THEME = {
  bg: '#ffffff',
  pageBg: '#f4f4f5',
  black: '#111111',
  orange: '#FF6B00',
  footerBg: '#f9f9f9',
  cardBg: '#f9f9f9',
  border: '#e5e5e5',
  muted: '#6B7280',
  lightMuted: '#9CA3AF',
  text: '#374151',
  maxWidth: 600,
} as const

/**
 * Public app base URL used in email CTAs (no trailing slash).
 */
export function appBaseUrl(): string {
  return env.APP_URL.replace(/\/+$/, '')
}

/**
 * Builds an absolute in-app path for email links.
 */
export function appUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${appBaseUrl()}${normalized}`
}

/**
 * Support / reply address shown in footers.
 */
export function supportEmail(): string {
  return env.MAILGUN_REPLY_TO ?? 'hello@appexme.com'
}

/**
 * Extracts a friendly first name from the user's full name.
 */
export function firstNameFrom(fullName: string): string {
  const trimmed = fullName.trim()
  if (!trimmed) return 'there'
  return trimmed.split(/\s+/)[0] ?? trimmed
}

export interface EmailLayoutInput {
  headline: string
  bodyHtml: string
  footerReason: string
}

/**
 * Wraps email content in the shared Appex white-card layout (600px, system font).
 */
export function renderEmailLayout(input: EmailLayoutInput): string {
  const { headline, bodyHtml, footerReason } = input
  const help = supportEmail()

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(headline)}</title>
</head>
<body style="margin:0;padding:0;background:${EMAIL_THEME.pageBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${EMAIL_THEME.pageBg};padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:${EMAIL_THEME.maxWidth}px;background:${EMAIL_THEME.bg};">
          <tr>
            <td style="padding:36px 32px 12px;text-align:center;">
              <p style="margin:0;font-size:30px;font-weight:800;letter-spacing:-0.03em;line-height:1;">
                <span style="color:${EMAIL_THEME.black};">App</span><span style="color:${EMAIL_THEME.orange};">ex</span>
              </p>
              <h1 style="margin:22px 0 0;font-size:24px;line-height:1.3;color:${EMAIL_THEME.black};font-weight:700;">${escapeHtml(headline)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 32px 32px;color:${EMAIL_THEME.text};font-size:15px;line-height:1.6;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:22px 32px;background:${EMAIL_THEME.footerBg};text-align:center;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:${EMAIL_THEME.muted};">
                ${escapeHtml(footerReason)} Questions?
                <a href="mailto:${escapeHtml(help)}" style="color:${EMAIL_THEME.muted};text-decoration:underline;">${escapeHtml(help)}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Renders a full-width primary black CTA button.
 */
export function renderCtaButton(label: string, href: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0 8px;">
  <tr>
    <td align="center" style="border-radius:10px;background:${EMAIL_THEME.black};">
      <a href="${escapeHtml(href)}" style="display:block;padding:16px 24px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;text-align:center;border-radius:10px;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`
}

/**
 * Renders a full-width outlined secondary button (white fill, dark border).
 */
export function renderOutlineButton(label: string, href: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0 8px;">
  <tr>
    <td align="center" style="border-radius:10px;border:1.5px solid ${EMAIL_THEME.black};background:${EMAIL_THEME.bg};">
      <a href="${escapeHtml(href)}" style="display:block;padding:15px 24px;font-size:16px;font-weight:700;color:${EMAIL_THEME.black};text-decoration:none;text-align:center;border-radius:10px;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`
}

/**
 * Renders an orange text link.
 */
export function renderTextLink(label: string, href: string): string {
  return `<a href="${escapeHtml(href)}" style="color:${EMAIL_THEME.orange};font-weight:600;text-decoration:none;">${escapeHtml(label)}</a>`
}

/**
 * Renders a horizontal divider between sections.
 */
export function renderDivider(): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px 0;">
  <tr><td style="border-top:1px solid ${EMAIL_THEME.border};font-size:0;line-height:0;">&nbsp;</td></tr>
</table>`
}

/**
 * Renders a checklist row for the E1 onboarding steps.
 */
export function renderChecklistItem(
  state: 'done' | 'active' | 'pending',
  label: string
): string {
  let icon = ''
  let labelStyle = `color:${EMAIL_THEME.black};font-weight:600;`

  if (state === 'done') {
    icon = `<span style="display:inline-block;width:22px;height:22px;line-height:22px;text-align:center;border-radius:50%;background:${EMAIL_THEME.black};color:#fff;font-size:12px;font-weight:700;">✓</span>`
    labelStyle = `color:${EMAIL_THEME.lightMuted};text-decoration:line-through;font-weight:500;`
  } else if (state === 'active') {
    icon = `<span style="display:inline-block;width:22px;height:22px;line-height:22px;text-align:center;border-radius:50%;background:#3B82F6;color:#fff;font-size:11px;">●</span>`
  } else {
    icon = `<span style="display:inline-block;width:22px;height:22px;line-height:22px;text-align:center;border-radius:50%;border:2px solid #D1D5DB;color:#D1D5DB;font-size:11px;">○</span>`
    labelStyle = `color:${EMAIL_THEME.lightMuted};font-weight:500;`
  }

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 10px;">
  <tr>
    <td width="34" valign="middle" style="padding-right:10px;">${icon}</td>
    <td valign="middle" style="font-size:15px;line-height:1.4;${labelStyle}">${escapeHtml(label)}</td>
  </tr>
</table>`
}

export interface FeatureCard {
  icon: string
  title: string
  description: string
}

/**
 * Renders a 2×2 feature card grid for the E1 "Why log in now?" section.
 */
export function renderFeatureCardGrid(cards: FeatureCard[]): string {
  const rows: string[] = []
  for (let i = 0; i < cards.length; i += 2) {
    const left = cards[i]
    const right = cards[i + 1]
    rows.push(`<tr>
      <td width="50%" valign="top" style="padding:6px;">${renderFeatureCard(left)}</td>
      <td width="50%" valign="top" style="padding:6px;">${right ? renderFeatureCard(right) : '&nbsp;'}</td>
    </tr>`)
  }

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 4px;">
    ${rows.join('')}
  </table>`
}

/**
 * Renders a single feature card with an orange icon badge.
 */
function renderFeatureCard(card: FeatureCard): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${EMAIL_THEME.cardBg};border-radius:14px;">
  <tr>
    <td style="padding:18px 16px;">
      <p style="margin:0 0 10px;font-size:22px;line-height:1;">${card.icon}</p>
      <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:${EMAIL_THEME.black};line-height:1.3;">${escapeHtml(card.title)}</p>
      <p style="margin:0;font-size:13px;line-height:1.45;color:${EMAIL_THEME.muted};">${escapeHtml(card.description)}</p>
    </td>
  </tr>
</table>`
}

/**
 * Renders a grey info box (renewal details in E3, email highlight in E2).
 */
export function renderInfoBox(rows: { label: string; value: string; valueColor?: string }[]): string {
  const inner = rows
    .map(
      (row, idx) => `<tr>
        <td style="padding:${idx === 0 ? '18px' : '0'} 20px ${idx === rows.length - 1 ? '18px' : '10px'} 20px;">
          <p style="margin:0 0 4px;font-size:13px;color:${EMAIL_THEME.muted};">${escapeHtml(row.label)}</p>
          <p style="margin:0;font-size:16px;font-weight:700;color:${row.valueColor ?? EMAIL_THEME.black};">${escapeHtml(row.value)}</p>
        </td>
      </tr>`
    )
    .join('')

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:${EMAIL_THEME.cardBg};border-radius:14px;">
    ${inner}
  </table>`
}

/**
 * Renders a centered email address highlight box for E2.
 */
export function renderEmailHighlight(email: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:4px 0 0;background:${EMAIL_THEME.cardBg};border-radius:14px;">
  <tr>
    <td align="center" style="padding:16px 20px;">
      <p style="margin:0;font-size:15px;font-weight:700;color:${EMAIL_THEME.orange};">${escapeHtml(email)}</p>
    </td>
  </tr>
</table>`
}

/**
 * Escapes HTML special characters for safe insertion into email templates.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Formats a renewal date for display in E3.
 */
export function formatRenewalDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })
  } catch {
    return iso.slice(0, 10)
  }
}

/**
 * Formats a USD price for display in E3.
 */
export function formatUsd(amount: number, currency = 'usd'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount)
  } catch {
    return `$${amount.toFixed(2)}`
  }
}
