import { formatIssuedDate, type CertificateData } from './certificate-download'

type CourseCertificateProps = CertificateData

/**
 * On-screen certificate preview (Appex branding, orange accent). Mirrors the
 * downloadable SVG (see `buildCertificateSvg`) so preview and file match.
 */
export function CourseCertificate({
  recipientName,
  courseTitle,
  description,
  certCode,
  issuedAt,
}: CourseCertificateProps) {
  const issuedOn = formatIssuedDate(issuedAt)

  return (
    <div
      className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-white px-[6%] py-[5%] text-[#0A0A0A] shadow-lg ring-1 ring-black/5"
      role="img"
      aria-label={`Certificate of completion for ${recipientName}: ${courseTitle}`}
    >
      <div className="absolute right-[8%] top-0 w-[10%]">
        <div
          className="w-full"
          style={{
            aspectRatio: '3 / 4',
            background: 'hsl(var(--primary))',
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)',
          }}
        />
      </div>

      <p className="font-serif text-[clamp(10px,1.6vw,18px)] text-[#222]">
        Certificate of completion
      </p>

      <h2 className="mt-[1%] max-w-[78%] font-serif font-bold uppercase leading-[0.98] tracking-tight text-[clamp(22px,5.2vw,60px)]">
        {courseTitle}
      </h2>

      <div className="mt-[7%] max-w-[58%]">
        <p className="font-serif uppercase tracking-wide text-[clamp(14px,2.6vw,30px)]">
          {recipientName}
        </p>
        <div className="mt-[1.5%] h-px w-full bg-[#9aa4b2]" />
      </div>

      <p className="mt-[2.5%] max-w-[62%] font-serif leading-snug text-[#333] text-[clamp(9px,1.5vw,16px)]">
        {description}
      </p>

      <div className="absolute inset-x-[6%] bottom-[5%] flex items-end justify-between gap-4">
        <div className="font-serif text-[clamp(8px,1.2vw,14px)] text-[#444]">
          <p className="border-b border-[#9aa4b2] pb-1 text-center">{issuedOn}</p>
          <p className="pt-1 text-center">ID: {certCode}</p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center rounded-lg bg-primary font-bold text-white"
            style={{ width: 'clamp(18px,2.4vw,28px)', height: 'clamp(18px,2.4vw,28px)', fontSize: 'clamp(11px,1.4vw,16px)' }}
          >
            A
          </div>
          <span className="font-bold tracking-tight text-[clamp(13px,1.9vw,22px)]">Appex</span>
        </div>

        <div className="flex items-end gap-[clamp(12px,3vw,40px)] text-center">
          <Signatory role="Course instructor" path={SIGNATURE_INSTRUCTOR} />
          <Signatory role="Founder, Appex" path={SIGNATURE_FOUNDER} />
        </div>
      </div>
    </div>
  )
}

function Signatory({ role, path }: { role: string; path: string }) {
  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 120 48"
        className="h-[clamp(22px,3.4vw,40px)] w-auto text-[#1a1a1a]"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d={path} />
      </svg>
      <p className="mt-1 font-serif text-[clamp(8px,1.2vw,14px)] text-[#444]">{role}</p>
    </div>
  )
}

// Hand-drawn-style signature strokes (decorative).
const SIGNATURE_INSTRUCTOR =
  'M6 34c8-2 10-18 14-18s2 22 8 22 6-20 12-20 2 16 8 16 8-12 14-12 6 10 14 8 12-14 18-12'
const SIGNATURE_FOUNDER =
  'M8 30c6 4 6-16 12-16s0 24 6 24 8-26 14-22 2 18 10 16 8-18 16-14 10 12 18 6'
