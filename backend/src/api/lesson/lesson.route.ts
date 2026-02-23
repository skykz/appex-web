import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import * as lessonController from './lesson.controller.js'

const router = Router()

router.get('/:id', requireAuth, lessonController.getLesson)
router.patch('/:id/progress', requireAuth, lessonController.updateProgress)
router.post('/:id/complete', requireAuth, lessonController.completeLesson)

export default router
