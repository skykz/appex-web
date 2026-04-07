import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/**
 * Maps Node/undici "fetch failed" errors (timeouts, DNS) into a short user-facing message.
 * Wrong passwords return quickly from Supabase; long waits usually mean the server never reached supabase.co.
 */
function messageForFetchFailure(err: unknown): string | null {
  if (!(err instanceof Error)) return null
  if (!/fetch failed/i.test(err.message)) return null

  const cause = err.cause
  if (cause && typeof cause === 'object' && 'code' in cause) {
    const code = String((cause as { code?: string }).code)
    if (code === 'UND_ERR_CONNECT_TIMEOUT') {
      return (
        'Cannot reach Supabase (connection timed out). This is a network/firewall issue, not your password. ' +
        'Try another network or VPN, allow outbound HTTPS to *.supabase.co, or open your Project URL in a browser on this machine to verify access.'
      )
    }
    if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
      return (
        'Cannot resolve the Supabase host (DNS). Check SUPABASE_URL and your internet connection.'
      )
    }
    if (code === 'ECONNREFUSED') {
      return 'Connection to Supabase was refused. Check SUPABASE_URL and proxy settings.'
    }
  }

  return (
    'Cannot reach the authentication service (network error). Check firewall, VPN, and that Supabase is reachable from this machine.'
  )
}

/**
 * Express error middleware: AppError, Zod, and friendly handling for upstream fetch failures to Supabase.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }

  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation error', details: err.errors })
    return
  }

  const fetchMsg = messageForFetchFailure(err)
  if (fetchMsg) {
    console.error('Upstream fetch error:', err)
    res.status(503).json({ error: fetchMsg })
    return
  }

  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
}
