import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import * as subController from './subscription.controller.js'

const router = Router()

router.get('/', requireAuth, subController.getSubscription)
router.patch('/pause', requireAuth, subController.pauseSubscription)

export default router
