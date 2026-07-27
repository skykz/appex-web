import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { log } from '../lib/logger.js'

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
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Every failure is written to error.jsonl with the request id, so a support
  // report ("payment failed at 14:32") can be traced without reproducing it.
  const context = {
    reqId: req.reqId,
    userId: req.userId,
    method: req.method,
    path: req.originalUrl?.split('?')[0],
  }

  if (err instanceof AppError) {
    // 4xx are expected outcomes (validation, conflicts) — warn, not error.
    log(err.statusCode >= 500 ? 'error' : 'warn', 'error', 'request.failed', {
      ...context,
      status: err.statusCode,
      kind: 'AppError',
      message: err.message,
    })
    res.status(err.statusCode).json({ error: err.message })
    return
  }

  if (err instanceof ZodError) {
    log('warn', 'error', 'request.failed', {
      ...context,
      status: 400,
      kind: 'ZodError',
      issues: err.errors,
    })
    res.status(400).json({ error: 'Validation error', details: err.errors })
    return
  }

  const fetchMsg = messageForFetchFailure(err)
  if (fetchMsg) {
    log('error', 'error', 'request.failed', {
      ...context,
      status: 503,
      kind: 'UpstreamFetch',
      message: fetchMsg,
      err,
    })
    res.status(503).json({ error: fetchMsg })
    return
  }

  log('error', 'error', 'request.failed', {
    ...context,
    status: 500,
    kind: 'Unhandled',
    err,
  })
  res.status(500).json({ error: 'Internal server error' })
}
