import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import * as userController from './user.controller.js'

const router = Router()

router.post('/', userController.createUser)
router.get('/me', requireAuth as never, userController.getCurrentUser)
router.get('/:id', userController.getUserById)
router.put('/me', requireAuth as never, userController.updateCurrentUser)

export default router
