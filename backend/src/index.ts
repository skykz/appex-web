import 'dotenv/config'
import { env } from './config/env.js'
import { app } from './app.js'
import { appLog, closeLogger, fileLoggingEnabled, logRunDir } from './lib/logger.js'

/**
 * Local / long-running host: start listening. On Vercel, `VERCEL` is set and the platform invokes `api/index.ts` instead.
 */
if (!process.env.VERCEL) {
  const server = app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`)
    if (fileLoggingEnabled()) {
      console.log(`Logs → ${logRunDir()}`)
    }
    appLog.info('server.started', {
      port: env.PORT,
      nodeEnv: process.env.NODE_ENV ?? 'development',
      stripeEnabled: env.stripeEnabled,
    })
  })

  // Flush buffered log lines before exiting — without this the last writes of a
  // debugging session (often the interesting ones) are lost on Ctrl-C.
  const shutdown = (signal: string) => {
    appLog.info('server.stopping', { signal })
    server.close(() => {
      void closeLogger().finally(() => process.exit(0))
    })
    // Don't hang forever if a connection refuses to close.
    setTimeout(() => {
      void closeLogger().finally(() => process.exit(0))
    }, 3000).unref()
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  // A crash is exactly when the log matters most, so record it before dying.
  process.on('uncaughtException', (err) => {
    appLog.error('process.uncaught_exception', { err })
    void closeLogger().finally(() => process.exit(1))
  })
  process.on('unhandledRejection', (reason) => {
    appLog.error('process.unhandled_rejection', { reason })
  })
}
