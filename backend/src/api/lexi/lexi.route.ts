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
import { lexiIpGate, lexiStreamLimiter } from '../../middleware/rate-limit.middleware.js'
import * as lexiController from './lexi.controller.js'

const router = Router()

// Two layers, and the order of all three matters:
//   lexiIpGate     — before requireAuth, so invalid-token floods are dropped
//                    without paying for a Supabase Auth round-trip each.
//   requireAuth    — populates userId.
//   lexiStreamLimiter — after auth, so the tight bucket is keyed by user id
//                    rather than IP; learners behind one NAT keep separate
//                    allowances.
router.post(
  '/stream',
  lexiIpGate,
  requireAuth,
  lexiStreamLimiter,
  lexiController.streamMessage
)
router.get('/thread', requireAuth, lexiController.getOrCreateThread)
router.get('/thread/:id/messages', requireAuth, lexiController.getThreadMessages)
router.patch('/messages/:id/feedback', requireAuth, lexiController.submitFeedback)

export default router
