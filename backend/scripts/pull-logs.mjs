#!/usr/bin/env node
/**
 * Collects JSONL logs from `logs/<run>/` into one stream for analysis.
 *
 * Every line keeps its original `domain`, and gains a `_run` field naming the
 * run folder it came from, so merged output stays traceable.
 *
 * Usage:
 *   node scripts/pull-logs.mjs                        # newest run, all domains
 *   node scripts/pull-logs.mjs --all                  # every run
 *   node scripts/pull-logs.mjs --domain payment       # one domain
 *   node scripts/pull-logs.mjs --domain payment,quiz  # several
 *   node scripts/pull-logs.mjs --level error          # this level and above
 *   node scripts/pull-logs.mjs --since 2h             # last 2 hours (m/h/d)
 *   node scripts/pull-logs.mjs --req <request-id>     # one request end-to-end
 *   node scripts/pull-logs.mjs --stats                # summary instead of lines
 *   node scripts/pull-logs.mjs --out bundle.jsonl     # write to a file
 *
 * Output is JSONL on stdout, so it pipes straight into other tools:
 *   node scripts/pull-logs.mjs --domain payment | jq 'select(.level=="error")'
 */

import fs from 'node:fs'
import path from 'node:path'

const LOG_ROOT = process.env.LOG_DIR?.trim() || path.resolve(process.cwd(), 'logs')

function parseArgs(argv) {
  const args = { domains: null, level: null, since: null, req: null, all: false, stats: false, out: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--all') args.all = true
    else if (a === '--stats') args.stats = true
    else if (a === '--domain') args.domains = argv[++i]?.split(',').map((s) => s.trim())
    else if (a === '--level') args.level = argv[++i]
    else if (a === '--since') args.since = argv[++i]
    else if (a === '--req') args.req = argv[++i]
    else if (a === '--out') args.out = argv[++i]
    else if (a === '--help' || a === '-h') args.help = true
  }
  return args
}

/** "90m" | "2h" | "3d" → cutoff timestamp in ms. */
function sinceToMs(value) {
  const m = /^(\d+)\s*([mhd])$/.exec(value?.trim() ?? '')
  if (!m) return null
  const n = Number(m[1])
  const unit = { m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2]]
  return Date.now() - n * unit
}

const LEVEL_ORDER = { debug: 10, info: 20, warn: 30, error: 40 }

function runDirs() {
  if (!fs.existsSync(LOG_ROOT)) return []
  return fs
    .readdirSync(LOG_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort() // ISO-ish names sort chronologically
}

function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n/, ''))
    return
  }

  const runs = runDirs()
  if (runs.length === 0) {
    console.error(`No logs found in ${LOG_ROOT}. Start the backend with LOG_TO_FILE=true first.`)
    process.exit(1)
  }

  const selected = args.all ? runs : [runs[runs.length - 1]]
  const minLevel = args.level ? LEVEL_ORDER[args.level] ?? 0 : 0
  const cutoff = args.since ? sinceToMs(args.since) : null
  if (args.since && cutoff === null) {
    console.error(`Bad --since "${args.since}". Use forms like 30m, 2h, 3d.`)
    process.exit(1)
  }

  const out = []
  const stats = { runs: selected, total: 0, byDomain: {}, byLevel: {}, byEvent: {}, errors: [] }

  for (const run of selected) {
    const dir = path.join(LOG_ROOT, run)
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl'))) {
      const domain = path.basename(file, '.jsonl')
      if (args.domains && !args.domains.includes(domain)) continue

      // Read line-by-line rather than JSON.parse on the whole file: a crashed
      // process can leave a half-written final line, which must not discard the
      // rest of the run.
      const text = fs.readFileSync(path.join(dir, file), 'utf8')
      for (const line of text.split('\n')) {
        if (!line.trim()) continue
        let entry
        try {
          entry = JSON.parse(line)
        } catch {
          continue // truncated tail from an abrupt exit
        }

        if (minLevel && (LEVEL_ORDER[entry.level] ?? 0) < minLevel) continue
        if (cutoff && Date.parse(entry.ts) < cutoff) continue
        if (args.req && entry.reqId !== args.req) continue

        entry._run = run
        out.push(entry)

        stats.total++
        stats.byDomain[domain] = (stats.byDomain[domain] ?? 0) + 1
        stats.byLevel[entry.level] = (stats.byLevel[entry.level] ?? 0) + 1
        stats.byEvent[entry.event] = (stats.byEvent[entry.event] ?? 0) + 1
        if (entry.level === 'error') {
          stats.errors.push({ ts: entry.ts, event: entry.event, reqId: entry.reqId })
        }
      }
    }
  }

  // Chronological across domains so a single request reads as a story. `seq`
  // breaks ties: millisecond timestamps collide for events in the same tick,
  // which would otherwise scramble their true order.
  out.sort((a, b) => {
    if (a.ts !== b.ts) return a.ts < b.ts ? -1 : 1
    if (a._run !== b._run) return a._run < b._run ? -1 : 1
    return (a.seq ?? 0) - (b.seq ?? 0)
  })

  if (args.stats) {
    const topEvents = Object.entries(stats.byEvent)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
    console.log(
      JSON.stringify(
        { ...stats, byEvent: Object.fromEntries(topEvents), errors: stats.errors.slice(0, 20) },
        null,
        2
      )
    )
    return
  }

  const body = out.map((e) => JSON.stringify(e)).join('\n')
  if (args.out) {
    fs.writeFileSync(args.out, body ? `${body}\n` : '')
    console.error(`Wrote ${out.length} entries → ${args.out}`)
  } else {
    if (body) process.stdout.write(`${body}\n`)
    console.error(`${out.length} entries from ${selected.length} run(s)`)
  }
}

main()
