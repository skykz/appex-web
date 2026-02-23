import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import * as chatController from './chat.controller.js'

const router = Router()

router.get('/models', requireAuth, chatController.getModels)
router.post('/messages', requireAuth, chatController.sendMessage)
router.get('/sessions', requireAuth, chatController.listSessions)
router.get('/sessions/:id', requireAuth, chatController.getSession)
router.delete('/sessions/:id', requireAuth, chatController.deleteSession)

export default router
