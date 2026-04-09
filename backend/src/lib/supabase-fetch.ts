import dns from 'node:dns'
import { Agent, fetch as undiciFetch } from 'undici'

type UndiciFetch = typeof undiciFetch

/**
 * Prefer IPv4 when resolving hostnames. On some Windows setups IPv6 is advertised but not routed,
 * which causes undici's default connect to stall until timeout against *.supabase.co.
 */
dns.setDefaultResultOrder('ipv4first')

const connectTimeoutMs = Number(process.env.SUPABASE_CONNECT_TIMEOUT_MS ?? 60_000)

/**
 * Shared HTTP agent for Supabase: extended connect timeout vs Node's default (~10s).
 */
const supabaseAgent = new Agent({
  connect: {
    timeout: connectTimeoutMs,
  },
})

/**
 * Custom fetch passed into createClient so Supabase requests use IPv4-first DNS and a longer connect timeout.
 */
export function supabaseFetch(
  ...args: Parameters<UndiciFetch>
): ReturnType<UndiciFetch> {
  const [input, init] = args
  return undiciFetch(input, {
    ...init,
    dispatcher: supabaseAgent,
  })
}
