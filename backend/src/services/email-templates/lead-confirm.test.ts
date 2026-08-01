import { describe, expect, it } from 'vitest'
import { renderLeadConfirmEmail } from './lead-confirm.js'

const URL = 'https://landing.example.com/confirm-email?token=TOK123'

/** Strips tags so assertions read the rendered copy, not the markup around it. */
function textOf(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

describe('renderLeadConfirmEmail', () => {
  it('puts the confirm URL in the CTA', () => {
    const { html } = renderLeadConfirmEmail({ firstName: 'Jim', confirmUrl: URL })
    expect(html).toContain('token=TOK123')
  })

  it('personalises the subject but keeps the headline impersonal', () => {
    const { subject, html } = renderLeadConfirmEmail({ firstName: 'Jim', confirmUrl: URL })
    expect(subject).toBe("Jim, one tap and you're in")
    // House style (welcome.ts): the name is greeted in the body, never in the <h1>.
    const headline = /<h1[^>]*>([^<]*)</.exec(html)?.[1]
    expect(headline).not.toContain('Jim')
    expect(textOf(html)).toContain('Hi, Jim')
  })

  it('omits the greeting entirely when no name is known', () => {
    const { subject, html } = renderLeadConfirmEmail({ firstName: '', confirmUrl: URL })
    expect(subject).toBe("One tap and you're in")
    // Guards the "Hi, 👋" artifact a naive template would produce.
    expect(html).not.toContain('Hi, ')
  })

  it('treats a whitespace-only name as no name', () => {
    const { subject } = renderLeadConfirmEmail({ firstName: '   ', confirmUrl: URL })
    expect(subject).toBe("One tap and you're in")
  })

  it('escapes a hostile name instead of emitting markup', () => {
    const { html } = renderLeadConfirmEmail({
      firstName: '<script>alert(1)</script>',
      confirmUrl: URL,
    })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('escapes quotes in the URL so they cannot break out of the href', () => {
    const { html } = renderLeadConfirmEmail({
      firstName: 'Jim',
      confirmUrl: 'https://x.io/c?t=1" onmouseover="alert(1)',
    })
    expect(html).not.toContain('onmouseover="alert')
    expect(html).toContain('&quot;')
  })

  it('states the same 7-day expiry the token TTL uses', () => {
    const { html, text } = renderLeadConfirmEmail({ firstName: 'Jim', confirmUrl: URL })
    expect(html).toContain('works for 7 days')
    expect(text).toContain('works for 7 days')
  })

  it('carries the CAN-SPAM reason line for mail sent to non-account holders', () => {
    const { html } = renderLeadConfirmEmail({ firstName: 'Jim', confirmUrl: URL })
    expect(textOf(html)).toContain('you entered your email in the Appex quiz')
  })

  it('keeps the plain-text part in step with the HTML', () => {
    // A mismatch between the two parts is a spam signal, not just untidiness.
    const { html, text } = renderLeadConfirmEmail({ firstName: 'Jim', confirmUrl: URL })
    const plain = textOf(html)
    const sentences = text
      .split('\n')
      .slice(2)
      .filter((l) => l.trim())
      .filter((l) => !/^(Confirm my email|Questions\?)/.test(l))

    expect(sentences.length).toBeGreaterThan(0)
    for (const line of sentences) {
      expect(plain).toContain(line.replace(/\s+/g, ' ').trim())
    }
  })

  it('renders a compact CTA rather than the full-width transactional one', () => {
    // The lead emails deliberately use renderCompactCtaButton; a full-bleed black
    // bar reads as a banner ad on a first-contact marketing email.
    const { html } = renderLeadConfirmEmail({ firstName: 'Jim', confirmUrl: URL })
    expect(html).toContain('display:inline-block')
    expect(html).not.toMatch(/width="100%"[^>]*>\s*<tr>\s*<td align="center" style="border-radius:10px/)
  })
})
