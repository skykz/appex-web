import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { RootLayout } from './layouts/root-layout'
import { ProtectedRoute } from './guards/protected-route'

const HomePage = lazy(() => import('@pages/home'))
const AuthPage = lazy(() => import('@pages/auth'))
const SettingsPage = lazy(() => import('@pages/settings'))
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

export const router = createBrowserRouter(
  [
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
      // Full-screen lesson routes (no sidebar)
      {
        path: 'skills/:skillId/lessons/:lessonId',
        element: (
          <Suspense fallback={<div className="flex h-dvh items-center justify-center"><div className="text-muted-foreground animate-pulse">Loading...</div></div>}>
            <SkillLessonPage />
          </Suspense>
        ),
      },
      {
        path: 'academy/courses/:courseId/lessons/:lessonId',
        element: (
          <Suspense fallback={<div className="flex h-dvh items-center justify-center"><div className="text-muted-foreground animate-pulse">Loading...</div></div>}>
            <LessonPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '/auth',
    element: (
      <Suspense fallback={<div className="flex h-dvh items-center justify-center"><div className="text-muted-foreground animate-pulse">Loading...</div></div>}>
        <AuthPage />
      </Suspense>
    ),
  },
  ],
  routerBasename ? { basename: routerBasename } : undefined
)
