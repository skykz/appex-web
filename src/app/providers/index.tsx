import type { ReactNode } from 'react'
import { QueryProvider } from './query-provider'
import { I18nProvider } from './i18n-provider'

/**
 * AppProviders combines all application-level providers.
 * Wraps the router with necessary context providers.
 *
 * @example
 * <AppProviders><RouterProvider router={router} /></AppProviders>
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <QueryProvider>{children}</QueryProvider>
    </I18nProvider>
  )
}
