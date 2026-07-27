/**
 * Local JSONL file logger for offline analysis.
 *
 * Writes one JSON object per line into `logs/<run-timestamp>/<domain>.jsonl`,
 * so a whole debugging session can be pulled with a single glob and fed to any
 * JSONL tool (jq, DuckDB, pandas) without parsing prose.
 *
 * Design notes:
 * - **Local only.** File logging is skipped unless `LOG_TO_FILE=true` (default
 *   on when NODE_ENV !== 'production'), so serverless deploys with read-only
 *   filesystems never attempt a write.
 * - **Never throws.** Logging is diagnostics, not business logic — a full disk
 *   or a bad path must not take down a payment. Every failure degrades to a
 *   one-time console warning.
 * - **Redacts by default.** Emails, tokens, card data and secrets are masked
 *   before they reach disk; these files are for debugging, not a PII archive.
 */

import fs from 'node:fs'
import path from 'node:path'

/** Log domains — one file per domain inside the run directory. */
export type LogDomain =
  | 'payment'
  | 'quiz'
  | 'dashboard'
  | 'auth'
  | 'http'
  | 'error'
  | 'app'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/** Shape of one JSONL line. Keys are short and stable for downstream queries. */
export interface LogEntry {
  ts: string
  /** Monotonic per-process counter; breaks ties when `ts` collides. */
  seq: number
  level: LogLevel
  domain: LogDomain
  /** Dot-separated event name, e.g. `checkout.session.created`. */
  event: string
  /** Correlates every line emitted while handling one HTTP request. */
  reqId?: string
  userId?: string
  /** Duration in ms, for timed operations. */
  ms?: number
  [key: string]: unknown
}

const FILE_LOGGING_ENABLED = (() => {
  const flag = process.env.LOG_TO_FILE?.trim().toLowerCase()
  if (flag === 'true' || flag === '1') return true
  if (flag === 'false' || flag === '0') return false
  return process.env.NODE_ENV !== 'production'
})()

/** Root for all runs; override with LOG_DIR. */
const LOG_ROOT = process.env.LOG_DIR?.trim() || path.resolve(process.cwd(), 'logs')

/**
 * Timestamp folder for this process: `2026-07-25T14-32-08`. Colons are illegal
 * in Windows paths, so the ISO time is dash-separated.
 */
function runFolderName(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, '').replace(/:/g, '-')
}

const RUN_DIR = path.join(LOG_ROOT, runFolderName())

/** One append stream per domain, opened lazily on first write. */
const streams = new Map<LogDomain, fs.WriteStream>()
let diskDisabled = false

let seqCounter = 0
function nextSeq(): number {
  return ++seqCounter
}

/** Prints one warning, then silently degrades — never spams on every line. */
function disableDisk(reason: unknown): void {
  if (diskDisabled) return
  diskDisabled = true
  console.warn('[logger] file logging disabled:', reason)
}

function streamFor(domain: LogDomain): fs.WriteStream | null {
  if (!FILE_LOGGING_ENABLED || diskDisabled) return null
  const existing = streams.get(domain)
  if (existing) return existing
  try {
    fs.mkdirSync(RUN_DIR, { recursive: true })
    const s = fs.createWriteStream(path.join(RUN_DIR, `${domain}.jsonl`), { flags: 'a' })
    s.on('error', disableDisk)
    streams.set(domain, s)
    return s
  } catch (err) {
    disableDisk(err)
    return null
  }
}

/* ── Redaction ─────────────────────────────────────────────────────────────
   These files sit on a laptop and get shared for analysis, so anything that
   identifies a person or grants access is masked before it is written. */

const SECRET_KEY_RE =
  /(password|secret|token|apikey|api_key|authorization|cookie|card|cvc|cvv|pan|iban|ssn)/i
const EMAIL_KEY_RE = /(^|_)(email|e_mail)$/i
const MAX_STRING = 2000

/** `alex@example.com` → `a***@example.com` — keeps grouping, drops identity. */
function maskEmail(value: string): string {
  const at = value.indexOf('@')
  if (at < 1) return '***'
  return `${value[0]}***${value.slice(at)}`
}

/** Depth-limited so a cyclic or huge object can't stall the request. */
function redact(value: unknown, depth = 0): unknown {
  if (value == null) return value
  if (depth > 6) return '[depth-limit]'

  if (typeof value === 'string') {
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…[truncated]` : value
  }
  if (typeof value !== 'object') return value

  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack }
  }
  if (Array.isArray(value)) {
    return value.slice(0, 100).map((v) => redact(v, depth + 1))
  }

  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEY_RE.test(k)) {
      out[k] = '[redacted]'
    } else if (EMAIL_KEY_RE.test(k) && typeof v === 'string') {
      out[k] = maskEmail(v)
    } else {
      out[k] = redact(v, depth + 1)
    }
  }
  return out
}

/** Serializes one entry; falls back to a marker if it can't be stringified. */
function serialize(entry: LogEntry): string {
  try {
    return `${JSON.stringify(entry)}\n`
  } catch {
    return `${JSON.stringify({
      ts: entry.ts,
      level: entry.level,
      domain: entry.domain,
      event: entry.event,
      _error: 'unserializable payload',
    })}\n`
  }
}

/**
 * Core write. Mirrors warn/error to the console so terminal debugging still
 * works, but routine info/debug lines only go to disk to keep output readable.
 */
export function log(
  level: LogLevel,
  domain: LogDomain,
  event: string,
  data: Record<string, unknown> = {}
): void {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    // Millisecond timestamps collide for events emitted in the same tick, which
    // loses their order once files are merged. `seq` is a per-process counter
    // that makes the true emission order recoverable.
    seq: nextSeq(),
    level,
    domain,
    event,
    ...(redact(data) as Record<string, unknown>),
  }

  const stream = streamFor(domain)
  if (stream) stream.write(serialize(entry))

  // `error` also lands in error.jsonl so failures across all domains can be
  // reviewed in one place without grepping every file.
  if (level === 'error' && domain !== 'error') {
    streamFor('error')?.write(serialize(entry))
  }

  if (level === 'error') {
    console.error(`[${domain}] ${event}`, data)
  } else if (level === 'warn') {
    console.warn(`[${domain}] ${event}`, data)
  }
}

/** Domain-scoped logger so call sites don't repeat the domain. */
export function createLogger(domain: LogDomain) {
  return {
    debug: (event: string, data?: Record<string, unknown>) => log('debug', domain, event, data),
    info: (event: string, data?: Record<string, unknown>) => log('info', domain, event, data),
    warn: (event: string, data?: Record<string, unknown>) => log('warn', domain, event, data),
    error: (event: string, data?: Record<string, unknown>) => log('error', domain, event, data),
    /** Times an async operation and logs its outcome either way. */
    async time<T>(event: string, fn: () => Promise<T>, data?: Record<string, unknown>): Promise<T> {
      const started = Date.now()
      try {
        const result = await fn()
        log('info', domain, event, { ...data, ms: Date.now() - started, ok: true })
        return result
      } catch (err) {
        log('error', domain, event, { ...data, ms: Date.now() - started, ok: false, err })
        throw err
      }
    },
  }
}

export const paymentLog = createLogger('payment')
export const quizLog = createLogger('quiz')
export const dashboardLog = createLogger('dashboard')
export const authLog = createLogger('auth')
export const httpLog = createLogger('http')
export const appLog = createLogger('app')

/** Absolute path of this run's folder — printed at boot so it's easy to find. */
export function logRunDir(): string {
  return RUN_DIR
}

export function fileLoggingEnabled(): boolean {
  return FILE_LOGGING_ENABLED && !diskDisabled
}

/** Flushes open streams so a shutdown doesn't drop buffered lines. */
export async function closeLogger(): Promise<void> {
  await Promise.all(
    [...streams.values()].map(
      (s) => new Promise<void>((resolve) => s.end(() => resolve()))
    )
  )
  streams.clear()
}
