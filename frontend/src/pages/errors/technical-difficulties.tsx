import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { useAuthStore } from '@entities/user'
import { Button } from '@shared/ui'
import { TechnicalDifficultiesIllustration } from './technical-difficulties-illustration'

export const SUPPORT_EMAIL = 'support@appex.me'

export type TechnicalDifficultiesVariant = 'technical' | 'not-found'

type TechnicalDifficultiesPageProps = {
  /** Switches copy between a generic outage and a missing-page message. */
  variant?: TechnicalDifficultiesVariant
}

const copy: Record<
  TechnicalDifficultiesVariant,
  { title: string; description: string }
> = {
  technical: {
    title: 'UH OH...',
    description:
      "We're experiencing some technical difficulties on our end. Please try again later or refresh the page.",
  },
  'not-found': {
    title: 'Page not found',
    description:
      "We couldn't find the page you're looking for. It may have moved or the link might be outdated.",
  },
}

/**
 * Full-screen fallback when something goes wrong — matches the AppEx shell and offers refresh / home actions.
 */
export default function TechnicalDifficultiesPage({
  variant = 'technical',
}: TechnicalDifficultiesPageProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const homeHref = isAuthenticated ? '/home' : '/auth'
  const { title, description } = copy[variant]

  /** Hard reload clears transient chunk / network errors after a deploy. */
  function handleRefresh() {
    window.location.reload()
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="grid w-full max-w-5xl items-center gap-10 md:grid-cols-2 md:gap-14">
        <div className="max-w-lg">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {description}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Apologies for any inconvenience. If the issue persists, contact us at{' '}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button type="button" size="lg" onClick={handleRefresh}>
              <RefreshCw className="size-4" />
              Refresh
            </Button>
            <Button asChild variant="link" size="lg" className="px-0">
              <Link to={homeHref}>Go Home</Link>
            </Button>
          </div>
        </div>

        <TechnicalDifficultiesIllustration variant={variant} />
      </div>
    </div>
  )
}
