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
 * Public learner-app base URL used in email CTAs (no trailing slash).
 * Prefer APP_PUBLIC_URL so production mail never points at localhost when APP_URL is left for local Stripe URLs.
 */
export function appBaseUrl(): string {
  const base = env.APP_PUBLIC_URL ?? env.APP_URL
  return base.replace(/\/+$/, '')
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
  /** When set, replaces the plain headline (must be pre-escaped HTML). */
  headlineHtml?: string
  bodyHtml: string
  footerReason: string
  /** When set, replaces the default two-line footer (must be pre-escaped HTML). */
  footerHtml?: string
}

/**
 * Wraps email content in the shared Appex white-card layout (600px, system font).
 */
export function renderEmailLayout(input: EmailLayoutInput): string {
  const { headline, headlineHtml, bodyHtml, footerReason, footerHtml } = input
  const help = supportEmail()
  const headlineBlock = headlineHtml
    ? headlineHtml
    : escapeHtml(headline)

  const footerBlock = footerHtml
    ? footerHtml
    : `<p style="margin:0 0 2px;font-size:12px;line-height:1.6;color:#aaaaaa;">${escapeHtml(footerReason)}</p>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#aaaaaa;">Questions? ${escapeHtml(help)}</p>`

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
              <h1 style="margin:22px 0 0;font-size:24px;line-height:1.3;color:${EMAIL_THEME.black};font-weight:700;">${headlineBlock}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 32px 32px;color:${EMAIL_THEME.text};font-size:15px;line-height:1.6;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:22px 32px;background:${EMAIL_THEME.footerBg};text-align:center;border-top:1px solid ${EMAIL_THEME.border};">
              ${footerBlock}
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
 * Renders a compact, content-width primary CTA (shrink-to-fit, not full bleed).
 *
 * Separate from renderCtaButton rather than a tweak to it: that one is shared by
 * all eleven transactional emails, and changing its size would silently restyle
 * every existing send. Used by the lead emails, where a full-width black bar
 * reads as a banner ad rather than a button.
 *
 * `align="center"` on the outer table plus a shrink-wrapping inner table is the
 * standard way to centre a button in Outlook, which ignores `margin:auto`.
 */
export function renderCompactCtaButton(label: string, href: string): string {
  return `<table role="presentation" align="center" cellspacing="0" cellpadding="0" style="margin:24px auto 8px;">
  <tr>
    <td align="center" style="border-radius:10px;background:${EMAIL_THEME.black};">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;text-align:center;border-radius:10px;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`
}

/**
 * Renders a full-width outlined secondary button (white fill, dark border).
 */
export function renderOutlineButton(label: string, href: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;">
  <tr>
    <td align="center" style="border-radius:6px;border:1px solid #cccccc;background:${EMAIL_THEME.bg};">
      <a href="${escapeHtml(href)}" style="display:block;padding:12px 24px;font-size:13px;font-weight:500;color:#555555;text-decoration:none;text-align:center;border-radius:6px;">${escapeHtml(label)}</a>
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
 * Renders a centered ghost text link below a primary CTA (E2 forgot password).
 */
export function renderGhostLink(label: string, href: string): string {
  return `<p style="margin:0 0 20px;text-align:center;font-size:13px;line-height:1.5;">
  <a href="${escapeHtml(href)}" style="color:#555555;text-decoration:none;">${escapeHtml(label)}</a>
</p>`
}

/**
 * Renders a checklist row for the E1 onboarding steps.
 */
export function renderChecklistItem(
  state: 'done' | 'active' | 'pending',
  label: string
): string {
  let icon = ''
  let labelStyle = `color:${EMAIL_THEME.black};font-weight:500;`

  if (state === 'done') {
    icon = `<span style="display:inline-block;width:20px;height:20px;line-height:20px;text-align:center;border-radius:50%;background:${EMAIL_THEME.black};color:#fff;font-size:11px;font-weight:700;">✓</span>`
    labelStyle = `color:#aaaaaa;text-decoration:line-through;font-weight:400;`
  } else if (state === 'active') {
    icon = `<span style="display:inline-block;width:20px;height:20px;border-radius:50%;border:2px solid ${EMAIL_THEME.black};background:#f5f5f5;"></span>`
  } else {
    icon = `<span style="display:inline-block;width:20px;height:20px;border-radius:50%;border:1px solid #cccccc;"></span>`
    labelStyle = `color:#aaaaaa;font-weight:400;`
  }

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0;border-bottom:1px solid #eeeeee;">
  <tr>
    <td width="32" valign="middle" style="padding:11px 12px 11px 0;">${icon}</td>
    <td valign="middle" style="padding:11px 0;font-size:14px;line-height:1.4;${labelStyle}">${escapeHtml(label)}</td>
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
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${EMAIL_THEME.cardBg};border:1px solid #eeeeee;border-radius:8px;">
  <tr>
    <td style="padding:14px;">
      <p style="margin:0 0 8px;font-size:18px;line-height:1;color:${EMAIL_THEME.orange};">${card.icon}</p>
      <p style="margin:0 0 3px;font-size:13px;font-weight:500;color:${EMAIL_THEME.black};line-height:1.3;">${escapeHtml(card.title)}</p>
      <p style="margin:0;font-size:12px;line-height:1.4;color:#888888;">${escapeHtml(card.description)}</p>
    </td>
  </tr>
</table>`
}

/**
 * Renders the renewal date + amount row used in E3/E5 renewal reminders.
 *
 * `cadence` ("every 4 weeks") adds a third column. It is optional because the
 * frequency is read from Stripe and may be unavailable; the box then falls back
 * to the original two-column layout instead of showing an empty field.
 */
export function renderRenewalRemindBox(
  renewalDate: string,
  amount: string,
  cadence?: string | null
): string {
  // Equal thirds when the cadence is present, halves when it is not. Widths are
  // inline on <td> because Outlook ignores stylesheet-driven table layout.
  const colWidth = cadence ? '33%' : '50%'
  const cadenceCell = cadence
    ? `
          <td width="34%" valign="top" align="right">
            <p style="margin:0 0 4px;font-size:12px;color:#888888;">Billing cycle</p>
            <p style="margin:0;font-size:15px;font-weight:500;color:#111111;">${escapeHtml(cadence)}</p>
          </td>`
    : ''

  // With three columns the amount sits in the middle, so centre it; with two it
  // stays right-aligned against the edge of the box.
  const amountAlign = cadence ? 'center' : 'right'

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;background:#f9f9f9;border:1px solid #eeeeee;border-radius:8px;">
  <tr>
    <td style="padding:18px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td width="${colWidth}" valign="top">
            <p style="margin:0 0 4px;font-size:12px;color:#888888;">Renewal date</p>
            <p style="margin:0;font-size:15px;font-weight:500;color:#111111;">${escapeHtml(renewalDate)}</p>
          </td>
          <td width="${colWidth}" valign="top" align="${amountAlign}">
            <p style="margin:0 0 4px;font-size:12px;color:#888888;">Amount</p>
            <p style="margin:0;font-size:15px;font-weight:500;color:#111111;">${escapeHtml(amount)}</p>
          </td>${cadenceCell}
        </tr>
      </table>
    </td>
  </tr>
</table>`
}

/**
 * Renders a titled info box for cancellation and similar notices.
 */
export function renderContentInfoBox(title: string, bodyHtml: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;background:#f9f9f9;border:1px solid #eeeeee;border-radius:8px;">
  <tr>
    <td style="padding:18px 20px;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:500;color:#111111;">${escapeHtml(title)}</p>
      <p style="margin:0;font-size:13px;color:#555555;line-height:1.6;">${bodyHtml}</p>
    </td>
  </tr>
</table>`
}

/**
 * Renders a grey info box (legacy stacked layout).
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
 * Short plan label for E7 receipt rows (e.g. "4 Weeks").
 */
export function planDisplayLabel(
  interval: 'day_1' | 'week_1' | 'week_4' | 'week_12' | 'year' | null | undefined,
  fallback = 'Premium'
): string {
  switch (interval) {
    case 'week_4':
      return '4 Weeks'
    case 'week_12':
      return '12 Weeks'
    case 'week_1':
      return '1 Week'
    // Entry offers bill on the 4-week cadence, so that is the plan the customer
    // is actually on by the time any of these emails go out.
    case 'day_1':
      return '4 Weeks'
    case 'year':
      return 'Yearly'
    default:
      return fallback
  }
}

/**
 * Renders the green success pill used in E7 payment confirmed.
 */
export function renderSuccessBadge(label: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;">
  <tr>
    <td align="center">
      <span style="display:inline-block;background:#f0faf4;border:1px solid #b7e4c7;border-radius:20px;padding:6px 14px;font-size:13px;font-weight:500;color:#1a7a42;line-height:1.4;">✓ ${escapeHtml(label)}</span>
    </td>
  </tr>
</table>`
}

export interface ReceiptRow {
  label: string
  value: string
}

/**
 * Renders a two-column receipt box for E7 renewal confirmations.
 */
export function renderReceiptBox(rows: ReceiptRow[]): string {
  const inner = rows
    .map((row, idx) => {
      const isLast = idx === rows.length - 1
      return `<tr>
        <td style="padding:6px 0;${isLast ? '' : 'border-bottom:1px solid #eeeeee;'}">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;${isLast ? 'font-weight:500;color:#111111;' : ''}">
            <tr>
              <td style="color:${isLast ? '#111111' : '#555555'};">${escapeHtml(row.label)}</td>
              <td align="right" style="color:#111111;">${escapeHtml(row.value)}</td>
            </tr>
          </table>
        </td>
      </tr>`
    })
    .join('')

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;background:#f9f9f9;border:1px solid #eeeeee;border-radius:8px;">
  <tr>
    <td style="padding:18px 20px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        ${inner}
      </table>
    </td>
  </tr>
</table>`
}

/**
 * Renders the friendly robot illustration for E6 reengagement emails.
 */
export function renderReengagementRobot(): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;">
  <tr>
    <td align="center">
      <svg width="120" height="140" viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;">
        <rect x="30" y="40" width="60" height="50" rx="10" fill="#f0f0f0" stroke="#ccc" stroke-width="1.5"/>
        <circle cx="44" cy="62" r="8" fill="#fff" stroke="#ccc" stroke-width="1.5"/>
        <circle cx="76" cy="62" r="8" fill="#fff" stroke="#ccc" stroke-width="1.5"/>
        <circle cx="44" cy="62" r="4" fill="#111"/>
        <circle cx="76" cy="62" r="4" fill="#111"/>
        <path d="M44 76 Q60 86 76 76" stroke="#555" stroke-width="2" stroke-linecap="round" fill="none"/>
        <rect x="52" y="28" width="16" height="14" rx="3" fill="#f0f0f0" stroke="#ccc" stroke-width="1.5"/>
        <circle cx="60" cy="28" r="3" fill="#FF6B00"/>
        <rect x="20" y="50" width="10" height="28" rx="5" fill="#f0f0f0" stroke="#ccc" stroke-width="1.5"/>
        <rect x="90" y="50" width="10" height="28" rx="5" fill="#f0f0f0" stroke="#ccc" stroke-width="1.5"/>
        <path d="M95 54 L108 44" stroke="#ccc" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="111" cy="42" r="5" fill="#f0f0f0" stroke="#FF6B00" stroke-width="1.5"/>
        <rect x="38" y="90" width="44" height="36" rx="6" fill="#f0f0f0" stroke="#ccc" stroke-width="1.5"/>
        <rect x="30" y="126" width="18" height="10" rx="5" fill="#f0f0f0" stroke="#ccc" stroke-width="1.5"/>
        <rect x="72" y="126" width="18" height="10" rx="5" fill="#f0f0f0" stroke="#ccc" stroke-width="1.5"/>
      </svg>
    </td>
  </tr>
</table>`
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
