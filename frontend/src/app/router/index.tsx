import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { AuthShell } from '@features/auth'
import { PageLoader } from '@shared/ui'
import { RootLayout } from './layouts/root-layout'
import { ProtectedRoute } from './guards/protected-route'
import RouteErrorPage from './route-error-page'
import TechnicalDifficultiesPage from '@pages/errors/technical-difficulties'

const HomePage = lazy(() => import('@pages/home'))
const AuthPage = lazy(() => import('@pages/auth'))
const ForgotPasswordPage = lazy(() => import('@pages/auth/forgot-password'))
const ResetPasswordPage = lazy(() => import('@pages/auth/reset-password'))
const AuthCallbackPage = lazy(() => import('@pages/auth/callback'))
const SettingsPage = lazy(() => import('@pages/settings'))
const MySubmissionsPage = lazy(() => import('@pages/submissions'))
const SkillsPage = lazy(() => import('@pages/skills'))
const SkillDetailPage = lazy(() => import('@pages/skills/detail'))
const AIChatPage = lazy(() => import('@pages/ai-tools/chat'))
const AssistantsPage = lazy(() => import('@pages/ai-tools/assistants'))
const AIAutomationPage = lazy(() => import('@pages/ai-tools/automation'))
const PromptsLibraryPage = lazy(() => import('@pages/resources/prompts'))
const PromptCollectionPage = lazy(
  () => import('@pages/resources/prompts/collection')
)
const DocumentationPage = lazy(() => import('@pages/resources/docs'))
const CoursePage = lazy(() => import('@pages/academy/course'))
const LessonPage = lazy(() => import('@pages/academy/lesson'))
const SkillLessonPage = lazy(() => import('@pages/skills/lesson'))

/** Matches Vite `base` when the app is hosted under a subpath (e.g. /app). */
const routerBasename =
  import.meta.env.BASE_URL === '/' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '')

const authRouteFallback = <PageLoader />

export const router = createBrowserRouter(
  [
  {
    errorElement: <RouteErrorPage />,
    children: [
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <RootLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/home" replace />,
          },
          {
            path: 'home',
            element: <HomePage />,
          },
          {
            path: 'settings',
            element: <SettingsPage />,
          },
          {
            path: 'submissions',
            element: <MySubmissionsPage />,
          },
          {
            path: 'skills',
            element: <SkillsPage />,
          },
          {
            path: 'skills/:skillId',
            element: <SkillDetailPage />,
          },
          {
            path: 'ai-tools',
            element: <Outlet />,
            children: [
              {
                index: true,
                element: <Navigate to="/ai-tools/chat" replace />,
              },
              {
                path: 'chat',
                element: <AIChatPage />,
              },
              {
                path: 'assistants',
                element: <AssistantsPage />,
              },
              {
                path: 'automation',
                element: <AIAutomationPage />,
              },
            ],
          },
          {
            path: 'resources/prompts',
            element: <PromptsLibraryPage />,
          },
          {
            path: 'resources/prompts/collection',
            element: <PromptCollectionPage />,
          },
          {
            path: 'resources/docs',
            element: <DocumentationPage />,
          },
          {
            path: 'academy/courses/:courseId',
            element: <CoursePage />,
          },
        ],
      },
      {
        path: 'skills/:skillId/lessons/:lessonId',
        element: (
          <Suspense fallback={<PageLoader />}>
            <SkillLessonPage />
          </Suspense>
        ),
      },
      {
        path: 'academy/courses/:courseId/lessons/:lessonId',
        element: (
          <Suspense fallback={<PageLoader />}>
            <LessonPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '/auth',
    element: (
      <Suspense fallback={authRouteFallback}>
        <AuthShell />
      </Suspense>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={authRouteFallback}>
            <AuthPage />
          </Suspense>
        ),
      },
      {
        path: 'forgot-password',
        element: (
          <Suspense fallback={authRouteFallback}>
            <ForgotPasswordPage />
          </Suspense>
        ),
      },
      {
        path: 'reset-password',
        element: (
          <Suspense fallback={authRouteFallback}>
            <ResetPasswordPage />
          </Suspense>
        ),
      },
      {
        path: 'callback',
        element: (
          <Suspense fallback={authRouteFallback}>
            <AuthCallbackPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <TechnicalDifficultiesPage variant="not-found" />,
  },
  ],
  },
  ],
  routerBasename ? { basename: routerBasename } : undefined
)
