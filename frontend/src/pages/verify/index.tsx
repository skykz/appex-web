import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BadgeCheck, ShieldX } from 'lucide-react'
import { PageLoader, Logo } from '@shared/ui'
import { skillsApi } from '@features/skills'
import { formatIssuedDate } from '@features/skills/certificate-download'

/**
 * Public credential verification page (/verify/:code). Resolves a certificate
 * code against the backend and confirms — to anyone, signed in or not — that it
 * was genuinely issued, to whom, for which course, and when.
 */
export default function VerifyCertificatePage() {
  const { code } = useParams<{ code: string }>()

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['certificate-verify', code],
    queryFn: () => skillsApi.verifyCertificate(code ?? ''),
    enabled: Boolean(code),
    retry: 1,
  })

  if (isPending) {
    return <PageLoader label="Verifying certificate…" />
  }

  // A network/500 failure is distinct from a genuinely invalid certificate —
  // don't mislabel a server error as "not found".
  if (isError) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-linear-to-b from-orange-50/60 via-background to-background px-4 py-12">
        <div className="w-full max-w-lg rounded-3xl border bg-card p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <ShieldX className="size-6" />
          </div>
          <h1 className="text-lg font-bold">Couldn't verify right now</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Something went wrong reaching the server. Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-5 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  const valid = data?.valid === true

  return (
    <div className="flex min-h-dvh items-center justify-center bg-linear-to-b from-orange-50/60 via-background to-background px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl border bg-card p-8 shadow-xl">
        <div className="mb-6">
          <Logo className="text-xl" />
        </div>

        {valid && data.valid ? (
          <>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-emerald-500/12 px-3 py-1 text-sm font-semibold text-emerald-600">
              <BadgeCheck className="size-4" />
              Valid certificate
            </div>
            <p className="text-muted-foreground text-sm">This credential was issued by AppEx.</p>

            <dl className="mt-6 divide-y divide-border rounded-2xl border">
              <Row label="Issued to" value={data.certificate.user_name} />
              <Row label="Course" value={data.certificate.course_title} />
              <Row label="Issued on" value={formatIssuedDate(data.certificate.issued_at)} />
              <Row label="Credential ID" value={data.certificate.cert_code} mono />
            </dl>
          </>
        ) : (
          <>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-red-500/12 px-3 py-1 text-sm font-semibold text-red-600">
              <ShieldX className="size-4" />
              Not found
            </div>
            <p className="text-muted-foreground text-sm">
              We couldn't find a certificate with the code{' '}
              <span className="font-mono font-semibold text-foreground">{code}</span>. Double-check
              the credential ID and try again.
            </p>
          </>
        )}

        <div className="mt-8 border-t pt-5">
          <Link to="/home" className="text-primary text-sm font-medium hover:underline">
            Go to AppEx →
          </Link>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</dt>
      <dd className={`text-right text-sm font-semibold ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  )
}
