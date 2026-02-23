import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import * as chatController from '../chat/chat.controller.js'

const router = Router()

router.get('/', requireAuth, chatController.getCredits)

export default router
