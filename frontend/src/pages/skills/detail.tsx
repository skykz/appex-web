import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, ChevronUp, ChevronDown, Lock, Sparkles, Download } from 'lucide-react'
import { cn } from '@shared/lib'
import { EmojiOrImageBadge } from '@shared/ui/emoji-or-image-badge'
import { PageLoader } from '@shared/ui'
import { skillsApi, type SkillModule } from '@features/skills'
import { PaywallDialog } from '@features/skills/paywall-dialog'
import { downloadCertificate, certificateToDownloadData } from '@features/skills/certificate-download'
import { useAuthStore } from '@entities/user'

/**
 * Single skill (course) overview with expandable modules and lesson links.
 */
export default function SkillDetailPage() {
  const { skillId } = useParams<{ skillId: string }>()
  const navigate = useNavigate()
  const id = Number(skillId)
  const userName = useAuthStore((s) => s.user?.name)

  const { data: skill, isPending, isError, refetch } = useQuery({
    queryKey: ['skill', id],
    queryFn: () => skillsApi.getDetail(id),
    enabled: Number.isFinite(id),
  })

  const [aboutExpanded, setAboutExpanded] = useState(false)
  const [paywallOpen, setPaywallOpen] = useState(false)

  if (!Number.isFinite(id)) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-muted-foreground text-sm">Invalid course link</p>
      </div>
    )
  }

  if (isPending) {
    return <PageLoader label="Loading course…" />
  }

  if (isError || !skill) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground text-center text-sm">
          Course not found or unavailable.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          Retry
        </button>
        <Link to="/skills" className="text-primary text-sm font-medium">
          Back to skills
        </Link>
      </div>
    )
  }

  const totalLessons = skill.modules.reduce(
    (sum, m) => sum + m.lessonCount,
    0
  )

  // The certificate is minted server-side the moment the course completes; the
  // detail response carries it. We only show the credential once it exists.
  const certificate = skill.certificate ?? null

  /** Downloads the earned certificate as a PDF named `certificate.pdf`. */
  function handleDownloadCertificate() {
    if (!certificate) return
    void downloadCertificate(certificateToDownloadData(certificate, userName))
  }

  return (
    <div className="relative min-h-dvh w-full py-2">
      <div className="px-4">
        <div className="mb-6 flex items-center gap-1.5 text-sm">
          <Link
            to="/skills"
            className="text-primary font-medium transition-colors hover:text-primary/80"
          >
            Skills
          </Link>
          <ChevronRight className="text-muted-foreground size-3.5" />
          <span className="text-muted-foreground">{skill.title}</span>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="min-w-0 flex-1">
            <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <div className="flex h-40 items-center justify-center bg-linear-to-br from-muted/60 to-muted/20 sm:h-56">
                <EmojiOrImageBadge value={skill.emoji} frameClassName="h-24 w-24 text-6xl sm:h-32 sm:w-32 sm:text-8xl" />
              </div>

              <div className="p-5">
                <h1 className="text-xl font-bold">{skill.title}</h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {skill.description}
                </p>

                <div className="mt-4 flex items-center gap-3">
                  <div className="h-1.5 flex-1 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${skill.progress}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {skill.progress}%
                  </span>
                </div>

                {certificate && !skill.premium_locked ? (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleDownloadCertificate}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] sm:w-auto sm:px-8"
                    >
                      <Download className="size-4" />
                      Download certificate
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/academy/courses/${skill.id}`)}
                      className="inline-flex w-full items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold transition-all hover:bg-muted active:scale-[0.98] sm:w-auto sm:px-8"
                    >
                      Review course
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      // Paywall short-circuit: paid skill + no active subscription
                      // → open the upsell instead of routing into a 402.
                      if (skill.premium_locked) {
                        setPaywallOpen(true)
                        return
                      }
                      const firstUnlocked = skill.modules
                        .flatMap((m) => m.lessons)
                        .find((l) => !l.locked)
                      if (firstUnlocked) {
                        navigate(`/skills/${skill.id}/lessons/${firstUnlocked.id}`)
                      }
                    }}
                    className={cn(
                      'mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all active:scale-[0.98] sm:w-auto sm:px-8',
                      skill.premium_locked
                        ? 'bg-linear-to-r from-amber-400 to-orange-500 text-white shadow-sm hover:from-amber-500 hover:to-orange-600'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    )}
                  >
                    {skill.premium_locked ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Sparkles className="size-4" />
                        Unlock with Premium
                      </span>
                    ) : skill.status === 'in_progress' ? (
                      'Continue'
                    ) : (
                      'Start course'
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-bold">About this course</h2>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border px-3 py-1 text-xs font-medium text-primary">
                  {totalLessons} lessons
                </span>
                <span className="rounded-full border px-3 py-1 text-xs font-medium text-primary">
                  {skill.duration}
                </span>
              </div>

              <p
                className={cn(
                  'mt-3 text-sm leading-relaxed text-muted-foreground',
                  !aboutExpanded && 'line-clamp-3'
                )}
              >
                {skill.about}
              </p>
              {skill.about.length > 150 && (
                <button
                  type="button"
                  onClick={() => setAboutExpanded(!aboutExpanded)}
                  className="mt-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                >
                  {aboutExpanded ? 'Show less' : 'See more'}
                </button>
              )}
            </div>
          </div>

          <div className="w-full shrink-0 lg:w-80 xl:w-96">
            {skill.modules.map((mod) => (
              <ModuleSection key={mod.id} module={mod} skillId={skill.id} />
            ))}
          </div>
        </div>
      </div>

      <PaywallDialog
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        blockedContent={skill.title}
      />
    </div>
  )
}

function ModuleSection({
  module,
  skillId,
}: {
  module: SkillModule
  skillId: number
}) {
  const [open, setOpen] = useState(true)
  // Paywall opened when the user clicks a Premium-locked lesson row.
  const [paywallFor, setPaywallFor] = useState<string | null>(null)

  return (
    <div className="mb-3 rounded-2xl border bg-card shadow-sm last:mb-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div>
          <h3 className="font-semibold leading-tight">{module.title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {module.lessonCount} lessons
          </p>
        </div>
        {open ? (
          <ChevronUp className="text-muted-foreground size-5 shrink-0" />
        ) : (
          <ChevronDown className="text-muted-foreground size-5 shrink-0" />
        )}
      </button>

      {open && (
        <div className="flex flex-col gap-1 px-3 pb-3">
          {module.lessons.map((lesson) => {
            const isPremiumLocked = lesson.locked && lesson.locked_reason === 'premium'
            const sequenceLocked = lesson.locked && !isPremiumLocked
            const indicator = isPremiumLocked ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-linear-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                <Sparkles className="size-3" />
                Premium
              </span>
            ) : sequenceLocked ? (
              <Lock className="text-muted-foreground/40 size-4 shrink-0" />
            ) : null

            const content = (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{lesson.label}</p>
                  <p className="text-sm font-semibold leading-tight">
                    {lesson.title}
                  </p>
                </div>
                {indicator}
              </>
            )

            if (sequenceLocked) {
              return (
                <div
                  key={lesson.id}
                  className="flex cursor-not-allowed items-center gap-3 rounded-xl p-3 opacity-60"
                >
                  {content}
                </div>
              )
            }

            if (isPremiumLocked) {
              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => setPaywallFor(lesson.title)}
                  className="flex w-full items-center gap-3 rounded-xl border border-amber-400/30 bg-linear-to-r from-amber-50/50 to-orange-50/50 p-3 text-left transition-all hover:from-amber-50 hover:to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 dark:hover:from-amber-950/40 dark:hover:to-orange-950/40"
                >
                  {content}
                </button>
              )
            }

            return (
              <Link
                key={lesson.id}
                to={`/skills/${skillId}/lessons/${lesson.id}`}
                className="flex items-center gap-3 rounded-xl p-3 transition-all duration-200 hover:bg-muted/60"
              >
                {content}
              </Link>
            )
          })}
        </div>
      )}

      <PaywallDialog
        open={paywallFor !== null}
        onOpenChange={(open) => {
          if (!open) setPaywallFor(null)
        }}
        blockedContent={paywallFor ?? undefined}
      />
    </div>
  )
}
