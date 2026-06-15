import { Component, type ErrorInfo, type ReactNode } from 'react'
import TechnicalDifficultiesPage from '@pages/errors/technical-difficulties'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
}

/**
 * Catches unexpected React render errors outside the router (providers, layout, etc.).
 */
export class AppErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled application error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return <TechnicalDifficultiesPage />
    }

    return this.props.children
  }
}
