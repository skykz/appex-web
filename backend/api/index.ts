/**
 * Vercel serverless entry: routes all traffic to the Express app (see vercel.json rewrites).
 */
import 'dotenv/config'
import { app } from '../src/app.js'

export default app
