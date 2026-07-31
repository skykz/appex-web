import { Router } from 'express'
import { authLimiter } from '../../middleware/rate-limit.middleware.js'
import * as authController from './auth.controller.js'

const router = Router()

// Credential endpoints get a per-IP limiter on top of the global one: these are
// unauthenticated, so there is no user to key on, and they are the natural target
// for credential stuffing and password-reset email flooding.
router.post('/login', authLimiter, authController.login)
router.post('/signup', authLimiter, authController.signup)
router.post('/refresh', authController.refresh)
router.post('/forgot-password', authLimiter, authController.forgotPassword)
router.post('/recover-password', authLimiter, authController.recoverPassword)

export default router
