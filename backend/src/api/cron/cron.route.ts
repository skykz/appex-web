import { Router } from 'express'
import { runRenewalEmailCron } from './cron.controller.js'

const router = Router()

router.get('/renewal-emails', runRenewalEmailCron)
router.post('/renewal-emails', runRenewalEmailCron)

export default router
