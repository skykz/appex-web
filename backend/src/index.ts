import 'dotenv/config'
import { env } from './config/env.js'
import { app } from './app.js'

/**
 * Local / long-running host: start listening. On Vercel, `VERCEL` is set and the platform invokes `api/index.ts` instead.
 */
if (!process.env.VERCEL) {
  app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`)
  })
}
