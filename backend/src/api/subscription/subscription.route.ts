import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import * as ctrl from './subscription.controller.js'

const router = Router()

// Public — pricing for the marketing/checkout UI before login if ever needed.
router.get('/plans', ctrl.listPlans)

router.get('/', requireAuth, ctrl.getSubscription)
router.post('/checkout', requireAuth, ctrl.createCheckout)
router.post('/sync-from-session', requireAuth, ctrl.syncFromSession)
router.post('/portal', requireAuth, ctrl.createPortal)
router.patch('/pause', requireAuth, ctrl.pauseSubscription)
router.patch('/resume', requireAuth, ctrl.resumeSubscription)
router.patch('/cancel', requireAuth, ctrl.cancelSubscription)
router.patch('/reactivate', requireAuth, ctrl.reactivateSubscription)
router.patch('/switch-to-yearly', requireAuth, ctrl.switchToYearly)

export default router
