import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { env } from './config/env.js'
import { errorHandler } from './utils/error-handler.js'
import authRoutes from './api/auth/auth.route.js'
import userRoutes from './api/user/user.route.js'

const app = express()

app.use(cors())
app.use(express.json())

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)

// Error handler (must be last)
app.use(errorHandler)

app.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`)
})
