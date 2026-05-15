import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  /** Comma-separated browser origins allowed to call the API (e.g. https://appex.kz,https://app.appex.kz). Empty = reflect any origin (dev-friendly). */
  CORS_ORIGINS: z.string().optional(),
  /** Optional extra comma-separated origins merged into CORS (e.g. admin SPA only: https://appex-web-admin.vercel.app). */
  CORS_ORIGINS_EXTRA: z.string().optional(),
  /**
   * Public origin of the learner SPA (no path). Used as Supabase `redirectTo` for password recovery emails.
   * If unset, the server falls back to the request `Origin` header or localhost:5173.
   */
  APP_PUBLIC_URL: z.string().url().optional(),
  /**
   * Public origin of the admin SPA when it differs from the learner app; used for admin "forgot password" redirects.
   */
  ADMIN_APP_PUBLIC_URL: z.string().url().optional(),

  /** OpenAI API key — powers ChatGPT, Nano Banana, and ChatGPT Image (DALL·E 3). */
  OPENAI_API_KEY: z.string().optional(),
  /** Chat completion model for `chatgpt` (default gpt-4o). */
  OPENAI_CHAT_MODEL: z.string().optional(),
  /** Fast / cheap OpenAI model for `nano-banana` (default gpt-4o-mini). */
  OPENAI_FAST_MODEL: z.string().optional(),

  /** Anthropic API key — powers Claude. */
  ANTHROPIC_API_KEY: z.string().optional(),
  /** Messages model for `claude` (default Claude 3.5 Sonnet). */
  ANTHROPIC_MODEL: z.string().optional(),

  /** DeepSeek API key — OpenAI-compatible chat at api.deepseek.com. */
  DEEPSEEK_API_KEY: z.string().optional(),
  /** Chat model id for DeepSeek (default deepseek-chat). */
  DEEPSEEK_MODEL: z.string().optional(),

  /** Perplexity API key — OpenAI-compatible chat at api.perplexity.ai. */
  PERPLEXITY_API_KEY: z.string().optional(),
  /** Perplexity model (default sonar). */
  PERPLEXITY_MODEL: z.string().optional(),

  // --- Stripe (subscription billing) ---
  /** Public URL of the React app (used for Stripe success/cancel/return URLs). */
  APP_URL: z.string().url().default('http://localhost:5173'),
  // Empty strings in .env mean "not configured" — coerce to undefined so callers
  // can do `if (env.STRIPE_INTRO_COUPON_ID)` without empty-string surprises.
  /** Stripe API secret key. */
  STRIPE_SECRET_KEY: z.string().optional().transform((v) => (v ? v : undefined)),
  /** Stripe webhook signing secret. */
  STRIPE_WEBHOOK_SECRET: z.string().optional().transform((v) => (v ? v : undefined)),
  /** Stripe price IDs for the two billing cadences. */
  STRIPE_PRICE_4WEEK: z.string().optional().transform((v) => (v ? v : undefined)),
  STRIPE_PRICE_YEARLY: z.string().optional().transform((v) => (v ? v : undefined)),
  /** Stripe coupon for the first-cycle intro price; optional. */
  STRIPE_INTRO_COUPON_ID: z.string().optional().transform((v) => (v ? v : undefined)),
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

/** Parses comma-separated origin lists and merges primary + extra without duplicates. */
function parseOriginList(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

const corsOriginsMerged = [
  ...new Set([...parseOriginList(parsed.CORS_ORIGINS), ...parseOriginList(parsed.CORS_ORIGINS_EXTRA)]),
]
const corsOrigins = corsOriginsMerged.length ? corsOriginsMerged : null

if (process.env.VERCEL && corsOrigins?.length) {
  console.info('[cors] allowed origins:', corsOrigins.join(' | '))
}

/** Stripe is fully configured when the secret key, webhook secret, and both prices are set. */
const stripeEnabled = Boolean(
  parsed.STRIPE_SECRET_KEY &&
    parsed.STRIPE_WEBHOOK_SECRET &&
    parsed.STRIPE_PRICE_4WEEK &&
    parsed.STRIPE_PRICE_YEARLY
)

export const env = { ...parsed, corsOrigins, stripeEnabled }
