import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import * as contactController from './contact.controller.js'

const router = Router()

router.post('/', requireAuth, contactController.submitContact)

export default router
