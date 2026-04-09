import { createClient, type SupabaseClientOptions } from '@supabase/supabase-js'
import { env } from '../config/env.js'
import { supabaseFetch } from '../lib/supabase-fetch.js'

/** Undici fetch matches runtime; DOM/undici Request types differ across @types — cast for createClient. */
const supabaseOptions = {
  global: {
    fetch: supabaseFetch as unknown as typeof fetch,
  },
} satisfies SupabaseClientOptions<'public'>

export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  supabaseOptions
)

export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseOptions
)
