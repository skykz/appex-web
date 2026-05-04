import { Router } from 'express'
import * as authController from './auth.controller.js'

const router = Router()

router.post('/login', authController.login)
router.post('/signup', authController.signup)
router.post('/refresh', authController.refresh)
router.post('/forgot-password', authController.forgotPassword)
router.post('/recover-password', authController.recoverPassword)

export default router
