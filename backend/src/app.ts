import express from 'express'
import cors from 'cors'
import { env } from './config/env.js'
import { errorHandler } from './utils/error-handler.js'
import authRoutes from './api/auth/auth.route.js'
import userRoutes from './api/user/user.route.js'
import skillRoutes from './api/skill/skill.route.js'
import lessonRoutes from './api/lesson/lesson.route.js'
import chatRoutes from './api/chat/chat.route.js'
import streakRoutes from './api/streak/streak.route.js'
import promptRoutes from './api/prompt/prompt.route.js'
import subscriptionRoutes from './api/subscription/subscription.route.js'
import creditRoutes from './api/credit/credit.route.js'
import contactRoutes from './api/contact/contact.route.js'
import billingRoutes from './api/billing/billing.route.js'

/**
 * Express application (shared by local `index.ts` and Vercel serverless `api/index.ts`).
 */
const app = express()

app.use(
  env.corsOrigins?.length
    ? cors({ origin: env.corsOrigins, credentials: false })
    : cors()
)
app.use(express.json())

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/skills', skillRoutes)
app.use('/api/lessons', lessonRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/streaks', streakRoutes)
app.use('/api/prompts', promptRoutes)
app.use('/api/subscription', subscriptionRoutes)
app.use('/api/credits', creditRoutes)
app.use('/api/contact', contactRoutes)
app.use('/api/billing', billingRoutes)

// Error handler (must be last)
app.use(errorHandler)

export { app }
