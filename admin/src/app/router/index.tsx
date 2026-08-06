import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './guards/protected-route'
import { AdminLayout } from '@app/layouts/admin-layout'
import { LoginPage } from '@pages/login'
import { ForgotPasswordPage } from '@pages/forgot-password'
import { ResetPasswordPage } from '@pages/reset-password'
import { DashboardPage } from '@pages/dashboard'
import { CategoriesPage } from '@pages/categories'
import { CoursesPage } from '@pages/courses'
import { CourseDetailPage } from '@pages/courses/detail'
import { UsersPage } from '@pages/users'
import { UserDetailPage } from '@pages/users/detail'
import { SupportInboxPage } from '@pages/support'
import { SubmissionsPage } from '@pages/submissions'
import { BillingPage } from '@pages/billing'
import { RefundsPage } from '@pages/refunds'
import { BillingAlertsPage } from '@pages/billing-alerts'
import { FunnelPage } from '@pages/funnel'
import { ExperimentsPage } from '@pages/experiments'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/auth/reset-password', element: <ResetPasswordPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/categories', element: <CategoriesPage /> },
          { path: '/courses', element: <CoursesPage /> },
          { path: '/courses/:id', element: <CourseDetailPage /> },
          { path: '/users', element: <UsersPage /> },
          { path: '/users/:id', element: <UserDetailPage /> },
          { path: '/billing', element: <BillingPage /> },
          { path: '/refunds', element: <RefundsPage /> },
          { path: '/billing-alerts', element: <BillingAlertsPage /> },
          { path: '/funnel', element: <FunnelPage /> },
          { path: '/experiments', element: <ExperimentsPage /> },
          { path: '/support', element: <SupportInboxPage /> },
          { path: '/submissions', element: <SubmissionsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
