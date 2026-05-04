import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import * as promptController from './prompt.controller.js'

const router = Router()

/** Personal library — register before `/` and `/categories`. */
router.get('/mine/categories', requireAuth, promptController.listMyCategories)
router.get('/mine', requireAuth, promptController.listMyPrompts)
router.post('/mine', requireAuth, promptController.createMyPrompt)
router.patch('/mine/:id', requireAuth, promptController.updateMyPrompt)
router.delete('/mine/:id', requireAuth, promptController.deleteMyPrompt)

router.get('/categories', requireAuth, promptController.listCategories)
router.get('/', requireAuth, promptController.listPrompts)

export default router
