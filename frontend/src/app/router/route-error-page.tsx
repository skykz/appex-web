import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import TechnicalDifficultiesPage, {
  type TechnicalDifficultiesVariant,
} from '@pages/errors/technical-difficulties'

/**
 * React Router error boundary — maps thrown route / render errors to the user-facing fallback page.
 */
export default function RouteErrorPage() {
  const error = useRouteError()

  let variant: TechnicalDifficultiesVariant = 'technical'
  if (isRouteErrorResponse(error) && error.status === 404) {
    variant = 'not-found'
  }

  return <TechnicalDifficultiesPage variant={variant} />
}
