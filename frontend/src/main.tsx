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
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://9bba8f4820750092a9f49a0d0cf203e2@o4511899441954816.ingest.us.sentry.io/4511899473018880",
  debug: true,
  release: import.meta.env.APP_VERSION || "development", 
  environment: "production",
  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/react/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: []
    }
});

// Находим корневой контейнер (в Vite это обычно 'root', а не 'app')
const container = document.getElementById('root');

if (!container) {
  throw new Error("Failed to find the root element");
}

// Создаем один общий root и рендерим в него ваше приложение
const root = createRoot(container);

root.render(
  <StrictMode>
    <AppErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </AppErrorBoundary>
  </StrictMode>
);

