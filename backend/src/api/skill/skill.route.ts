import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import * as skillController from './skill.controller.js'

const router = Router()

router.get('/', requireAuth, skillController.listSkills)
router.get('/:id', requireAuth, skillController.getSkillDetail)

export default router
