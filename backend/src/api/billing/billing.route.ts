import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import * as subController from '../subscription/subscription.controller.js'

const router = Router()

router.get('/history', requireAuth, subController.getBillingHistory)

export default router
