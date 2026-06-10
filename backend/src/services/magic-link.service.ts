import { env } from '../config/env.js'
import { supabaseAdmin } from '../db/supabase.js'

/**
 * Returns the learner SPA URL Supabase redirects to after a magic link click.
 */
export function magicLinkRedirectUrl(): string {
  const base = (env.APP_PUBLIC_URL ?? env.APP_URL).replace(/\/+$/, '')
  return `${base}/auth/callback`
}

/**
 * Generates a one-time Supabase magic link URL for passwordless sign-in.
 */
export async function generateMagicLinkUrl(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase()
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: normalized,
    options: {
      redirectTo: magicLinkRedirectUrl(),
    },
  })

  if (error) {
    console.error('[magic-link] generateLink failed', normalized, error.message)
    return null
  }

  return data.properties?.action_link ?? null
}
