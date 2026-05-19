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
import adminRoutes from './api/admin/admin.route.js'
import { stripeWebhookHandler } from './api/stripe/stripe.webhook.js'

/**
 * Express application (shared by local `index.ts` and Vercel serverless `api/index.ts`).
 */
const app = express()

/**
 * When `CORS_ORIGINS` is set, only those exact origins get `Access-Control-Allow-Origin`
 * (required for browser preflight on admin + user SPAs on Vercel). If the admin origin is missing,
 * login from https://appex-web-admin.vercel.app fails with “No Access-Control-Allow-Origin”.
 */
app.use(
  env.corsOrigins?.length
    ? cors({
        origin: env.corsOrigins,
        credentials: false,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        optionsSuccessStatus: 204,
      })
    : cors()
)

// Stripe webhook MUST be mounted BEFORE express.json() so the raw body is
// preserved for signature verification. `stripe.webhooks.constructEvent`
// rejects any tampering with the body, including the JSON re-serialization
// that express.json() performs.
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler
)

app.use(express.json({ limit: '25mb' }))

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
app.use('/api/admin', adminRoutes)

// Error handler (must be last)
app.use(errorHandler)

export { app }
