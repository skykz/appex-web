import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { requireAdmin } from '../../middleware/require-admin.middleware.js'
import { adminLogin } from './admin-auth.controller.js'
import { getDashboardStats } from './dashboard.controller.js'
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from './categories.controller.js'
import {
  listCourses,
  getCourseDetail,
  createCourse,
  updateCourse,
  deleteCourse,
  createModule,
  updateModule,
  deleteModule,
  createLesson,
  updateLesson,
  deleteLesson,
} from './courses.controller.js'
import { listAdminUsers } from './users.controller.js'

const router = Router()

// Public admin endpoints
router.post('/auth/login', adminLogin)

// Protected admin endpoints
const guard = [requireAuth, requireAdmin] as const

router.get('/dashboard', ...guard, getDashboardStats)

router.get('/categories', ...guard, listCategories)
router.post('/categories', ...guard, createCategory)
router.patch('/categories/:id', ...guard, updateCategory)
router.delete('/categories/:id', ...guard, deleteCategory)

router.get('/courses', ...guard, listCourses)
router.get('/courses/:id', ...guard, getCourseDetail)
router.post('/courses', ...guard, createCourse)
router.patch('/courses/:id', ...guard, updateCourse)
router.delete('/courses/:id', ...guard, deleteCourse)

router.post('/courses/:courseId/modules', ...guard, createModule)
router.patch('/modules/:id', ...guard, updateModule)
router.delete('/modules/:id', ...guard, deleteModule)

router.post('/modules/:moduleId/lessons', ...guard, createLesson)
router.patch('/lessons/:id', ...guard, updateLesson)
router.delete('/lessons/:id', ...guard, deleteLesson)

router.get('/users', ...guard, listAdminUsers)

export default router
