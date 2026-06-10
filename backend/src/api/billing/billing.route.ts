import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import * as subController from '../subscription/subscription.controller.js'
import { getRefundEligibility } from './refund.controller.js'

const router = Router()

router.get('/history', requireAuth, subController.getBillingHistory)
router.get('/refund-eligibility', requireAuth, getRefundEligibility)

export default router
