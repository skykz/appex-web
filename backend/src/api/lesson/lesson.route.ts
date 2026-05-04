import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import * as lessonController from './lesson.controller.js'

const router = Router()

router.get('/:id', requireAuth, lessonController.getLesson)
router.patch('/:id/progress', requireAuth, lessonController.updateProgress)
router.post('/:id/complete', requireAuth, lessonController.completeLesson)
router.post('/:id/quiz-check', requireAuth, lessonController.checkQuizAnswer)
router.get('/:id/submissions/me', requireAuth, lessonController.getMyLessonSubmission)
router.post('/:id/submissions', requireAuth, lessonController.submitLessonSubmission)

export default router
