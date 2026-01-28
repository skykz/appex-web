import type { ReactNode } from 'react'
import '@shared/i18n'

/**
 * I18nProvider initializes i18next for the application.
 * The i18n configuration is imported as a side effect.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}
