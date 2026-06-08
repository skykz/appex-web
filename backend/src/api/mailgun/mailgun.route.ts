import { Router } from 'express'
import { mailgunWebhookHandler } from './mailgun.webhook.js'

const router = Router()

router.post('/webhook', mailgunWebhookHandler)

export default router
