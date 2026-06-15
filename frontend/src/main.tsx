import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { AppProviders } from './app/providers'
import { AppErrorBoundary } from './app/error-boundary'
import { router } from './app/router'
import './app/styles/globals.css'

/**
 * Application entry point.
 * Bootstraps React with all providers and routing.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </AppErrorBoundary>
  </StrictMode>
)
