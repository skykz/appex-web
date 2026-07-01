import { supabaseAdmin } from '../db/supabase.js'
import { renderPasswordResetEmail } from './email-templates/password-reset.js'
import { firstNameFrom } from './email-templates/layout.js'
import { sendEmail } from './email.service.js'

/**
 * Generates a one-time Supabase recovery link URL for the password-reset email CTA.
 */
export async function generateRecoveryLinkUrl(
  email: string,
  redirectTo: string
): Promise<string | null> {
  const normalized = email.trim().toLowerCase()
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: normalized,
    options: { redirectTo },
  })

  if (error) {
    console.warn('[password-reset] generateLink failed', normalized, error.message)
    return null
  }

  return data.properties?.action_link ?? null
}

/**
 * Looks up a display name for password-reset email personalization.
 */
async function fetchFirstNameForEmail(email: string): Promise<string | undefined> {
  const normalized = email.trim().toLowerCase()
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('name')
    .eq('email', normalized)
    .maybeSingle()

  if (error) {
    console.warn('[password-reset] profile lookup failed', normalized, error.message)
    return undefined
  }

  const name = typeof data?.name === 'string' ? data.name.trim() : ''
  return name ? firstNameFrom(name) : undefined
}

/**
 * Sends a branded Mailgun password-reset email when the account exists.
 * Returns false when the user is unknown or Mailgun is not configured (caller still responds neutrally).
 */
export async function sendPasswordResetEmail(args: {
  email: string
  redirectTo: string
}): Promise<boolean> {
  const normalized = args.email.trim().toLowerCase()
  const resetUrl = await generateRecoveryLinkUrl(normalized, args.redirectTo)
  if (!resetUrl) return false

  const firstName = await fetchFirstNameForEmail(normalized)
  const rendered = renderPasswordResetEmail({ firstName, resetUrl })

  const sent = await sendEmail({
    to: normalized,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    tag: 'password-reset',
  })

  return Boolean(sent)
}
