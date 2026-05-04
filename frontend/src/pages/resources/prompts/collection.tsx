import { Navigate } from 'react-router-dom'

/**
 * Legacy URL: old “collection” route sends users to the unified prompt library.
 */
export default function PromptCollectionRedirect() {
  return <Navigate to="/resources/prompts" replace />
}
