import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BadgeCheck, ShieldX } from 'lucide-react'
import { PageLoader } from '@shared/ui'
import { skillsApi } from '@features/skills'
import { formatIssuedDate } from '@features/skills/certificate-download'

/**
 * Public credential verification page (/verify/:code). Resolves a certificate
 * code against the backend and confirms — to anyone, signed in or not — that it
 * was genuinely issued, to whom, for which course, and when.
 */
export default function VerifyCertificatePage() {
  const { code } = useParams<{ code: string }>()

  const { data, isPending } = useQuery({
    queryKey: ['certificate-verify', code],
    queryFn: () => skillsApi.verifyCertificate(code ?? ''),
    enabled: Boolean(code),
  })

  if (isPending) {
    return <PageLoader label="Verifying certificate…" />
  }

  const valid = data?.valid === true

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-orange-50/60 via-background to-background px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl border bg-card p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            A
          </div>
          <span className="text-lg font-bold tracking-tight">Appex</span>
        </div>

        {valid && data.valid ? (
          <>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-emerald-500/12 px-3 py-1 text-sm font-semibold text-emerald-600">
              <BadgeCheck className="size-4" />
              Valid certificate
            </div>
            <p className="text-muted-foreground text-sm">This credential was issued by Appex.</p>

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
            Go to Appex →
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
