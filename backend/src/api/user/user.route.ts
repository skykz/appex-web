import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import * as userController from './user.controller.js'

const router = Router()

router.post('/', userController.createUser)
router.get('/me', requireAuth, userController.getCurrentUser)
router.put('/me', requireAuth, userController.updateCurrentUser)
router.patch('/me/password', requireAuth, userController.changePassword)
router.get('/:id', userController.getUserById)

export default router
