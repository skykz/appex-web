import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RootLayout } from './layouts/root-layout'

/**
 * Lazy-loaded page components for code splitting.
 * Each route chunk is loaded only when accessed.
 */
const HomePage = lazy(() => import('@pages/home'))
const AuthPage = lazy(() => import('@pages/auth'))
const SettingsPage = lazy(() => import('@pages/settings'))
const SkillsPage = lazy(() => import('@pages/skills'))
const AIToolsPage = lazy(() => import('@pages/ai-tools'))
const ChatAssistantsPage = lazy(() => import('@pages/chat-assistants'))
const AutomationPage = lazy(() => import('@pages/automation'))
const PromptsLibraryPage = lazy(() => import('@pages/resources/prompts'))
const PromptCollectionPage = lazy(
  () => import('@pages/resources/prompts/collection')
)
const DocumentationPage = lazy(() => import('@pages/resources/docs'))
const CoursePage = lazy(() => import('@pages/academy/course'))
const LessonPage = lazy(() => import('@pages/academy/lesson'))

/**
 * Application router configuration.
 * Uses React Router data APIs with lazy loading for optimal performance.
 */
export const router = createBrowserRouter([
  {
    path: '/',
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
        path: 'ai-tools',
        element: <AIToolsPage />,
      },
      {
        path: 'chat-assistants',
        element: <ChatAssistantsPage />,
      },
      {
        path: 'automation',
        element: <AutomationPage />,
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
      {
        path: 'academy/courses/:courseId/lessons/:lessonId',
        element: <LessonPage />,
      },
    ],
  },
  {
    path: '/auth',
    element: <AuthPage />,
  },
])
