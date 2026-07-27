/**
 * Per-request logging: assigns a correlation id, exposes it to handlers, and
 * writes one `http.request` line per finished response.
 *
 * The id is what ties a payment line, a quiz line and an error line back to the
 * same click when you pull the JSONL files later.
 */

import { randomUUID } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { httpLog } from '../lib/logger.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Correlation id shared by every log line for this request. */
      reqId: string
      /** Set by requireAuth once the caller is known. */
      userId?: string
    }
  }
}

/** Query keys whose values must never be written to disk. */
const SENSITIVE_QUERY = /(token|secret|key|password|session_id|code)/i

function safeQuery(query: Request['query']): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(query)) {
    out[k] = SENSITIVE_QUERY.test(k) ? '[redacted]' : v
  }
  return out
}

/**
 * Routes are grouped so you can filter by area instead of raw paths, whose ids
 * make every URL unique.
 */
function areaFor(pathname: string): string {
  if (pathname.startsWith('/api/landing') || pathname.startsWith('/api/stripe')) return 'payment'
  if (pathname.startsWith('/api/billing') || pathname.startsWith('/api/subscription')) return 'payment'
  if (pathname.startsWith('/api/skills') || pathname.startsWith('/api/lessons')) return 'dashboard'
  if (pathname.startsWith('/api/streaks') || pathname.startsWith('/api/certificates')) return 'dashboard'
  if (pathname.startsWith('/api/auth')) return 'auth'
  return 'other'
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Honour an inbound id so a trace survives across services; otherwise mint one.
  const incoming = req.get('x-request-id')
  req.reqId = incoming && incoming.length <= 64 ? incoming : randomUUID()
  res.setHeader('x-request-id', req.reqId)

  const started = Date.now()

  // `finish` fires on a completed response; `close` covers client aborts, which
  // would otherwise leave slow or cancelled requests unlogged.
  let done = false
  const record = (aborted: boolean) => {
    if (done) return
    done = true
    const ms = Date.now() - started
    const status = res.statusCode
    const level = aborted ? 'warn' : status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'

    httpLog[level]('http.request', {
      reqId: req.reqId,
      userId: req.userId,
      method: req.method,
      path: req.originalUrl.split('?')[0],
      area: areaFor(req.path),
      status,
      ms,
      ...(aborted ? { aborted: true } : {}),
      ...(Object.keys(req.query).length ? { query: safeQuery(req.query) } : {}),
      ip: req.ip,
      ua: req.get('user-agent'),
    })
  }

  res.on('finish', () => record(false))
  res.on('close', () => record(!res.writableEnded))

  next()
}
