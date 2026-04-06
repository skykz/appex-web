import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
})

const parsed = envSchema.parse(process.env)

/**
 * Fails fast when .env still contains Supabase placeholders from .env.example,
 * so the server does not hang on ConnectTimeout to a fake host.
 */
function assertSupabaseConfigured() {
  const url = parsed.SUPABASE_URL.toLowerCase()
  if (url.includes('your-project.supabase.co')) {
    throw new Error(
      'SUPABASE_URL is still the .env.example placeholder. Open Supabase → Project Settings → API, copy the Project URL into backend/.env, and restart the server.'
    )
  }
  if (
    parsed.SUPABASE_ANON_KEY === 'your-anon-key' ||
    parsed.SUPABASE_SERVICE_ROLE_KEY === 'your-service-role-key'
  ) {
    throw new Error(
      'Supabase API keys are still placeholders. Copy anon and service_role keys from Supabase → Project Settings → API into backend/.env and restart.'
    )
  }
}

assertSupabaseConfigured()

export const env = parsed
