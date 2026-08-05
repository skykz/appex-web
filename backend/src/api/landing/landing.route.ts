import { Router } from 'express'
import { confirmTokenLimiter } from '../../middleware/rate-limit.middleware.js'
import * as landingController from './landing.controller.js'

const router = Router()

router.post('/quiz', landingController.submitLandingQuiz)
// Public, token-bearing: rate limited per IP so it can't be hammered.
router.get('/confirm', confirmTokenLimiter, landingController.confirmLandingLeadEmail)
router.post('/quiz/events', landingController.ingestQuizEvents)
router.get('/quiz/content', landingController.getQuizContent)
router.get('/quiz/funnel', landingController.getQuizFunnel)
router.patch('/quiz/plan', landingController.updateLandingQuizPlan)
router.post('/checkout', landingController.createLandingCheckout)
router.get('/checkout/session', landingController.getLandingCheckoutSessionStatus)
router.post('/checkout/complete', landingController.completeLandingCheckout)

export default router
