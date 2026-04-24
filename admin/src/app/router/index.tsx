import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './guards/protected-route'
import { AdminLayout } from '@app/layouts/admin-layout'
import { LoginPage } from '@pages/login'
import { DashboardPage } from '@pages/dashboard'
import { CategoriesPage } from '@pages/categories'
import { CoursesPage } from '@pages/courses'
import { CourseDetailPage } from '@pages/courses/detail'
import { UsersPage } from '@pages/users'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
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
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
