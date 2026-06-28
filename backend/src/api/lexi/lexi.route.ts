/**
 * Lexi routes — in-course AI mentor.
 *
 * POST   /api/lexi/stream                      — SSE streaming chat turn
 * GET    /api/lexi/thread                      — get or create thread for a course
 * GET    /api/lexi/thread/:id/messages         — load thread history
 * PATCH  /api/lexi/messages/:id/feedback       — store 👍/👎 rating
 */

import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import * as lexiController from './lexi.controller.js'

const router = Router()

router.post('/stream', requireAuth, lexiController.streamMessage)
router.get('/thread', requireAuth, lexiController.getOrCreateThread)
router.get('/thread/:id/messages', requireAuth, lexiController.getThreadMessages)
router.patch('/messages/:id/feedback', requireAuth, lexiController.submitFeedback)

export default router
