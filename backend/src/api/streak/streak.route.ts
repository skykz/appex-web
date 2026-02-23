import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import * as streakController from './streak.controller.js'

const router = Router()

router.get('/', requireAuth, streakController.getStreak)
router.post('/check-in', requireAuth, streakController.checkIn)
router.get('/calendar', requireAuth, streakController.getCalendar)

export default router
