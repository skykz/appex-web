import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import * as promptController from './prompt.controller.js'

const router = Router()

router.get('/', requireAuth, promptController.listPrompts)
router.get('/categories', requireAuth, promptController.listCategories)

export default router
