import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import * as certificateController from './certificate.controller.js'

const router = Router()

// Public credential verification (shareable). Must stay above any auth.
router.get('/verify/:code', certificateController.verifyCertificateByCode)

// Authenticated: the learner's own earned certificates.
router.get('/', requireAuth, certificateController.listMyCertificates)

export default router
