import { describe, expect, it } from 'vitest'
import { renderLeadGuidebookEmail } from './lead-guidebook.js'

const URL = 'https://appexme.com/downloads/ai-agents-guidebook.pdf'

function textOf(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

describe('renderLeadGuidebookEmail', () => {
  it('links the download URL', () => {
    const { html } = renderLeadGuidebookEmail({ firstName: 'Jim', guidebookUrl: URL })
    expect(html).toContain(URL)
  })

  it('personalises the subject, not the headline', () => {
    const { subject, html } = renderLeadGuidebookEmail({ firstName: 'Jim', guidebookUrl: URL })
    expect(subject).toBe("Jim, here's your guidebook")
    expect(/<h1[^>]*>([^<]*)</.exec(html)?.[1]).not.toContain('Jim')
  })

  it('falls back cleanly with no name', () => {
    const { subject, html } = renderLeadGuidebookEmail({ firstName: '', guidebookUrl: URL })
    expect(subject).toBe("Here's your guidebook")
    expect(html).not.toContain('Hi, ')
  })

  it('escapes a hostile name', () => {
    const { html } = renderLeadGuidebookEmail({
      firstName: '<img src=x onerror=alert(1)>',
      guidebookUrl: URL,
    })
    expect(html).not.toContain('<img src=x')
  })

  it('keeps the plain-text part in step with the HTML', () => {
    const { html, text } = renderLeadGuidebookEmail({ firstName: 'Jim', guidebookUrl: URL })
    const plain = textOf(html)
    const sentences = text
      .split('\n')
      .slice(2)
      .filter((l) => l.trim())
      .filter((l) => !/^(Get the guidebook|Questions\?)/.test(l))

    expect(sentences.length).toBeGreaterThan(0)
    for (const line of sentences) {
      expect(plain).toContain(line.replace(/\s+/g, ' ').trim())
    }
  })

  it('carries the quiz-sourced CAN-SPAM reason, not the account one', () => {
    // These addresses never created an account, so "you created an account at
    // Appex" — the line every transactional template uses — would be false.
    const { html } = renderLeadGuidebookEmail({ firstName: 'Jim', guidebookUrl: URL })
    expect(textOf(html)).toContain('you entered your email in the Appex quiz')
    expect(textOf(html)).not.toContain('you created an account')
  })
})
