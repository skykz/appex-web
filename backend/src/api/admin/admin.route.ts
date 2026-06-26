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
  reorderCourses,
  reorderCourseModules,
  reorderModuleLessons,
} from './courses.controller.js'
import { listAdminUsers } from './users.controller.js'
import { listContactMessages, patchContactMessage, getContactUnreadCount, markAllContactMessagesRead } from './contact-inbox.controller.js'
import {
  listLessonSubmissions,
  patchLessonSubmission,
  getLessonSubmissionsUnreadCount,
  markAllLessonSubmissionsRead,
} from './submissions.controller.js'
import {
  listAdminSubscriptions,
  listAdminBillingHistory,
} from './billing.controller.js'
import { evaluateAdminRefund, processAdminRefund } from '../billing/refund.controller.js'
import { getLessonEngagement } from './lesson-engagement.controller.js'

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
router.patch('/courses/order', ...guard, reorderCourses)
router.get('/courses/:id', ...guard, getCourseDetail)
router.post('/courses', ...guard, createCourse)
router.patch('/courses/:id', ...guard, updateCourse)
router.delete('/courses/:id', ...guard, deleteCourse)

router.post('/courses/:courseId/modules', ...guard, createModule)
router.patch('/courses/:courseId/modules/reorder', ...guard, reorderCourseModules)
router.patch('/modules/:id', ...guard, updateModule)
router.delete('/modules/:id', ...guard, deleteModule)

router.patch('/modules/:moduleId/lessons/reorder', ...guard, reorderModuleLessons)
router.post('/modules/:moduleId/lessons', ...guard, createLesson)
router.patch('/lessons/:id', ...guard, updateLesson)
router.delete('/lessons/:id', ...guard, deleteLesson)
router.get('/lessons/:id/engagement', ...guard, getLessonEngagement)

router.get('/users', ...guard, listAdminUsers)

router.get('/subscriptions', ...guard, listAdminSubscriptions)
router.get('/billing-history', ...guard, listAdminBillingHistory)
router.post('/users/:userId/refund/evaluate', ...guard, evaluateAdminRefund)
router.post('/users/:userId/refund/process', ...guard, processAdminRefund)

router.get('/contact-messages/unread-count', ...guard, getContactUnreadCount)
router.post('/contact-messages/read-all', ...guard, markAllContactMessagesRead)
router.get('/contact-messages', ...guard, listContactMessages)
router.patch('/contact-messages/:id', ...guard, patchContactMessage)

router.get('/lesson-submissions/unread-count', ...guard, getLessonSubmissionsUnreadCount)
router.post('/lesson-submissions/read-all', ...guard, markAllLessonSubmissionsRead)
router.get('/lesson-submissions', ...guard, listLessonSubmissions)
router.patch('/lesson-submissions/:id', ...guard, patchLessonSubmission)

export default router
