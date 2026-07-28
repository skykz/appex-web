import { z } from 'zod'

/**
 * Production origins, used as fallbacks so a missing env var on Vercel can't
 * silently point production at localhost (which would strand paying customers
 * and break conversion tracking). Env vars still win when set.
 *
 *   appexme.com      → USA marketing landing (quiz, paywall, thank-you page)
 *   app.appexme.com  → learner platform (the product itself)
 */
const PROD_LANDING_URL = 'https://appexme.com'
const PROD_APP_URL = 'https://app.appexme.com'

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  /** Comma-separated browser origins allowed to call the API (e.g. https://appexme.com,https://app.appexme.com). Empty = reflect any origin (dev-friendly). */
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

  /*
   * Anthropic — DISABLED project-wide; everything runs on OPENAI_API_KEY.
   * Lexi (services/lexi.service.ts) and the chat model catalog both use OpenAI.
   * Restore these two lines to bring Claude back.
   *
   * ANTHROPIC_API_KEY: z.string().optional(),
   * ANTHROPIC_MODEL: z.string().optional(),
   */

  /** DeepSeek API key — OpenAI-compatible chat at api.deepseek.com. */
  DEEPSEEK_API_KEY: z.string().optional(),
  /** Chat model id for DeepSeek (default deepseek-chat). */
  DEEPSEEK_MODEL: z.string().optional(),

  /** Perplexity API key — OpenAI-compatible chat at api.perplexity.ai. */
  PERPLEXITY_API_KEY: z.string().optional(),
  /** Perplexity model (default sonar). */
  PERPLEXITY_MODEL: z.string().optional(),

  /**
   * Lexi system prompt override. When set, replaces the hardcoded Lexi persona
   * so Bota can edit the mentor's voice from Vercel env vars without a deploy.
   */
  LEXI_SYSTEM_PROMPT: z.string().optional(),

  // --- Stripe (subscription billing) ---
  /**
   * Public URL of the learner platform (Stripe success/cancel/return URLs, email
   * links). Resolved below: falls back to the live app domain in production and
   * localhost in dev, so a missing env var can't send customers to localhost.
   */
  APP_URL: z.string().url().optional(),
  /**
   * Public URL of the USA marketing landing (Stripe success/cancel for payment-first checkout).
   * Defaults to localhost:5175 for local dev.
   */
  USA_LANDING_URL: z.string().url().optional(),
  // Empty strings in .env mean "not configured" — coerce to undefined so callers
  // can do `if (env.STRIPE_INTRO_COUPON_ID)` without empty-string surprises.
  /** Stripe API secret key. */
  STRIPE_SECRET_KEY: z.string().optional().transform((v) => (v ? v : undefined)),
  /** Stripe webhook signing secret. */
  STRIPE_WEBHOOK_SECRET: z.string().optional().transform((v) => (v ? v : undefined)),
  /** Stripe price IDs for billing cadences. */
  STRIPE_PRICE_1WEEK: z.string().optional().transform((v) => (v ? v : undefined)),
  /**
   * Phase-1 price for the "1 Week" plan ($17.77/week). The plan is sold as a
   * two-phase Subscription Schedule: one week at this price (discounted by the
   * tier coupon), then it converts to STRIPE_PRICE_4WEEK forever. A single
   * subscription can't express "7 days then a different cadence", which is what
   * the paywall advertises.
   */
  STRIPE_PRICE_1WEEK_INTRO: z.string().optional().transform((v) => (v ? v : undefined)),
  STRIPE_PRICE_4WEEK: z.string().optional().transform((v) => (v ? v : undefined)),
  STRIPE_PRICE_YEARLY: z.string().optional().transform((v) => (v ? v : undefined)),
  /** Stripe coupon for the first-cycle intro price on the 4-week plan (legacy single-coupon fallback). */
  STRIPE_INTRO_COUPON_ID: z.string().optional().transform((v) => (v ? v : undefined)),
  /** Per-plan intro coupons (USA paywall, 61% off). Fall back to STRIPE_INTRO_COUPON_ID for week_4 when unset. */
  STRIPE_INTRO_COUPON_1WEEK: z.string().optional().transform((v) => (v ? v : undefined)),
  STRIPE_INTRO_COUPON_4WEEK: z.string().optional().transform((v) => (v ? v : undefined)),
  STRIPE_INTRO_COUPON_YEAR: z.string().optional().transform((v) => (v ? v : undefined)),
  /**
   * Per-plan exit-intent coupons (USA paywall, 71% off). When a plan has no exit
   * coupon configured, the checkout silently falls back to its 61% intro coupon —
   * never to full price — so a missing env var can't overcharge a promised discount.
   */
  STRIPE_EXIT_COUPON_1WEEK: z.string().optional().transform((v) => (v ? v : undefined)),
  STRIPE_EXIT_COUPON_4WEEK: z.string().optional().transform((v) => (v ? v : undefined)),
  STRIPE_EXIT_COUPON_YEAR: z.string().optional().transform((v) => (v ? v : undefined)),

  /**
   * Where billing alerts that need a human are emailed (e.g. a "1 Week" plan
   * whose 4-week conversion failed and is now renewing weekly at full price).
   * Unset → alerts are still persisted to billing_alerts and logged, just not
   * emailed, so a missing var degrades visibility instead of losing the alert.
   */
  BILLING_ALERT_EMAIL: z.string().email().optional().transform((v) => (v ? v : undefined)),

  // --- Mailgun (transactional + marketing email) ---
  /** Mailgun private API key (Dashboard → Settings → API keys). */
  MAILGUN_API_KEY: z.string().optional().transform((v) => (v ? v : undefined)),
  /** Verified sending domain, e.g. mg.appex.me (not sandbox.mailgun.org in production). */
  MAILGUN_DOMAIN: z.string().optional().transform((v) => (v ? v : undefined)),
  /** From header, e.g. AppEx <noreply@mg.appex.me> — must use the verified domain. */
  MAILGUN_FROM: z.string().optional().transform((v) => (v ? v : undefined)),
  /** Reply-To for user-facing mail, e.g. support@appex.me */
  MAILGUN_REPLY_TO: z.string().email().optional().transform((v) => (v ? v : undefined)),
  /** Webhook signing key (Mailgun → Webhooks → HTTP webhook → signing key). */
  MAILGUN_WEBHOOK_SIGNING_KEY: z.string().optional().transform((v) => (v ? v : undefined)),
  /** CAN-SPAM footer line in marketing mail. */
  MAILGUN_COMPANY_NAME: z.string().optional().transform((v) => (v ? v : undefined)),
  MAILGUN_PHYSICAL_ADDRESS: z.string().optional().transform((v) => (v ? v : undefined)),
  /** When true, use the EU Mailgun API host (api.eu.mailgun.net). */
  MAILGUN_EU_REGION: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  /**
   * When true on Vercel/production, refuse to start if Mailgun still uses a sandbox domain.
   * Leave false while testing sandbox locally.
   */
  MAILGUN_REQUIRE_PRODUCTION_DOMAIN: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  /** Protects /api/cron/* (Vercel Cron sends Authorization: Bearer <secret>). */
  CRON_SECRET: z.string().optional().transform((v) => (v ? v : undefined)),

  // --- Meta Conversions API (server-side Purchase for the ads funnel) ---
  /**
   * Meta Pixel id (same id as VITE_META_PIXEL_ID on the USA landing). Defaults to
   * the live Appex pixel — public, so safe to bake in. CAPI still stays OFF until
   * META_CAPI_ACCESS_TOKEN (a secret) is also set; see metaCapiEnabled below.
   */
  META_PIXEL_ID: z
    .string()
    .optional()
    .transform((v) => (v ? v : '1766890887825527')),
  /** Conversions API access token (Events Manager → Settings → Conversions API). */
  META_CAPI_ACCESS_TOKEN: z.string().optional().transform((v) => (v ? v : undefined)),
  /** Optional test event code — routes CAPI events to the Events Manager test stream. */
  META_TEST_EVENT_CODE: z.string().optional().transform((v) => (v ? v : undefined)),

  // --- GA4 Measurement Protocol (server-side purchase for the ads funnel) ---
  /**
   * GA4 Measurement ID — defaults to the dedicated "Appex Landing" stream
   * (G-9VSNWFGHR6), the same id the landing's gtag.js layer sends to. Public, so
   * safe to bake in. The server purchase still stays OFF until GA4_API_SECRET (a
   * secret) is also set; see ga4MpEnabled below.
   */
  GA4_MEASUREMENT_ID: z
    .string()
    .optional()
    .transform((v) => (v ? v : 'G-9VSNWFGHR6')),
  /** GA4 Measurement Protocol API secret (Admin → Data Streams → Measurement Protocol). */
  GA4_API_SECRET: z.string().optional().transform((v) => (v ? v : undefined)),
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

/** Stripe is fully configured when keys, webhook secret, and all landing plan prices are set. */
const stripeEnabled = Boolean(
  parsed.STRIPE_SECRET_KEY &&
    parsed.STRIPE_WEBHOOK_SECRET &&
    parsed.STRIPE_PRICE_1WEEK &&
    parsed.STRIPE_PRICE_4WEEK &&
    parsed.STRIPE_PRICE_YEARLY
)

/** Mailgun is ready when API key, domain, and from address are all set. */
const mailgunEnabled = Boolean(
  parsed.MAILGUN_API_KEY && parsed.MAILGUN_DOMAIN && parsed.MAILGUN_FROM
)

/** True when the configured domain is Mailgun's sandbox (dev-only; hurts deliverability). */
const mailgunSandbox = Boolean(
  parsed.MAILGUN_DOMAIN?.includes('.mailgun.org')
)

const isProductionHost = Boolean(process.env.VERCEL || process.env.NODE_ENV === 'production')

/**
 * Warns or fails when production deploy still points at a Mailgun sandbox domain.
 */
function assertMailgunProductionReady() {
  if (!mailgunEnabled || !mailgunSandbox) return

  const msg =
    '[email] Mailgun sandbox domain is configured. Use a verified custom domain (e.g. mg.appex.me) in production.'

  if (isProductionHost && parsed.MAILGUN_REQUIRE_PRODUCTION_DOMAIN) {
    throw new Error(`${msg} Set MAILGUN_REQUIRE_PRODUCTION_DOMAIN=false only for staging.`)
  }

  if (isProductionHost) {
    console.warn(msg)
  }
}

assertMailgunProductionReady()

/**
 * Warns when production mail would still embed localhost links (APP_PUBLIC_URL unset and APP_URL is local).
 */
function warnEmailLinksMisconfigured() {
  if (!isProductionHost || !mailgunEnabled) return
  // Mirrors the APP_URL resolution in the exported env below.
  const appUrl = (parsed.APP_URL ?? PROD_APP_URL).replace(/\/+$/, '')
  const publicUrl = parsed.APP_PUBLIC_URL?.replace(/\/+$/, '')
  const emailBase = publicUrl ?? appUrl
  if (emailBase.includes('localhost') || emailBase.includes('127.0.0.1')) {
    console.warn(
      '[email] APP_PUBLIC_URL is unset and APP_URL is localhost — transactional email links will not work for customers. Set APP_PUBLIC_URL (and APP_URL) to your live learner app URL on Vercel.'
    )
  }
}

warnEmailLinksMisconfigured()

/** Meta Conversions API is ready when both the pixel id and access token are set. */
const metaCapiEnabled = Boolean(parsed.META_PIXEL_ID && parsed.META_CAPI_ACCESS_TOKEN)

/** GA4 Measurement Protocol is ready when both the measurement id and API secret are set. */
const ga4MpEnabled = Boolean(parsed.GA4_MEASUREMENT_ID && parsed.GA4_API_SECRET)

export const env = {
  ...parsed,
  /** Learner platform origin (app.appexme.com in production). */
  APP_URL: parsed.APP_URL ?? (isProductionHost ? PROD_APP_URL : 'http://localhost:5173'),
  /**
   * Landing origin used for Stripe success/cancel URLs. Falls back to the live
   * landing domain in production — a localhost fallback there would strand paying
   * customers on an unreachable page and lose the browser Purchase event.
   */
  USA_LANDING_URL:
    parsed.USA_LANDING_URL ??
    (isProductionHost ? PROD_LANDING_URL : 'http://localhost:5175'),
  corsOrigins,
  stripeEnabled,
  mailgunEnabled,
  mailgunSandbox,
  mailgunWebhooksEnabled: Boolean(parsed.MAILGUN_WEBHOOK_SIGNING_KEY),
  metaCapiEnabled,
  ga4MpEnabled,
}
