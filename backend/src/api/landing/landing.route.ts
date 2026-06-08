import { Router } from 'express'
import * as landingController from './landing.controller.js'

const router = Router()

router.post('/quiz', landingController.submitLandingQuiz)
router.patch('/quiz/plan', landingController.updateLandingQuizPlan)

export default router
