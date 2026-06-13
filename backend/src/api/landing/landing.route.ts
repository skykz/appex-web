import { Router } from 'express'
import * as landingController from './landing.controller.js'

const router = Router()

router.post('/quiz', landingController.submitLandingQuiz)
router.patch('/quiz/plan', landingController.updateLandingQuizPlan)
router.post('/checkout', landingController.createLandingCheckout)
router.get('/checkout/session', landingController.getLandingCheckoutSessionStatus)
router.post('/checkout/complete', landingController.completeLandingCheckout)

export default router
