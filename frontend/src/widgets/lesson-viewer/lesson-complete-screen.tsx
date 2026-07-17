import { useMemo, useState } from 'react'
import { Star, Monitor, Loader2, PartyPopper } from 'lucide-react'
import { cn } from '@shared/lib'
import { Button } from '@shared/ui'

/** Confetti colors drawn from the app's warm/accent palette. */
const CONFETTI_COLORS = [
  '#f97316',
  '#fbbf24',
  '#f43f5e',
  '#6366f1',
  '#22c55e',
  '#fb7185',
]

interface ConfettiPiece {
  left: number
  drift: number
  rotate: number
  delay: number
  duration: number
  color: string
}

/**
 * Deterministically builds `count` confetti pieces spread across the width, each
 * with its own drift, spin, delay, and color. Built once per mount.
 */
function buildConfetti(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => {
    // Pseudo-random but stable per index (avoids Math.random for SSR/reduced churn).
    const seed = (i * 9301 + 49297) % 233280
    const rand = seed / 233280
    const rand2 = ((i * 4021 + 13) % 977) / 977
    return {
      left: (i / count) * 100 + rand * 6,
      drift: (rand - 0.5) * 220,
      rotate: 360 + Math.round(rand2 * 540),
      delay: rand2 * 0.6,
      duration: 2.2 + rand * 1.6,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    }
  })
}

interface LessonCompleteScreenProps {
  lessonLabel: string
  /** Runs when the learner leaves feedback (rating optional); may show streak next depending on result. */
  onContinue: (payload?: { rating?: number; feedback?: string }) => void | Promise<void>
}

/**
 * Post-lesson feedback step before streak (first check-in of the day) or exit.
 */
export function LessonCompleteScreen({
  lessonLabel,
  onContinue,
}: LessonCompleteScreenProps) {
  const [rating, setRating] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [feedbackText, setFeedbackText] = useState('')
  const [busy, setBusy] = useState(false)
  const confetti = useMemo(() => buildConfetti(40), [])

  /**
   * Awaits persistence (lesson complete + streak check-in) before the parent advances the flow.
   */
  async function handleContinue() {
    if (busy) return
    setBusy(true)
    try {
      await onContinue({
        rating: rating > 0 ? rating : undefined,
        feedback: feedbackText.trim() || undefined,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-linear-to-b from-orange-50/70 via-background to-background">
      {/* One-shot confetti burst on mount. */}
      <div
        className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
        aria-hidden
      >
        {confetti.map((piece, i) => (
          <span
            key={i}
            className="confetti-piece"
            style={
              {
                left: `${piece.left}%`,
                background: piece.color,
                '--confetti-x': `${piece.drift}px`,
                '--confetti-r': `${piece.rotate}deg`,
                '--confetti-delay': `${piece.delay}s`,
                '--confetti-duration': `${piece.duration}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-xl rounded-3xl border border-orange-200/70 bg-card px-5 py-7 text-center shadow-xl shadow-orange-500/10 ring-1 ring-orange-100 sm:px-8 sm:py-8">
          <div className="celebrate-badge mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-linear-to-br from-amber-300 to-orange-500 text-white shadow-lg shadow-orange-500/25">
            <PartyPopper className="size-9" strokeWidth={2.4} aria-hidden />
          </div>

          <div
            className="celebrate-rise mb-2 flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground"
            style={{ animationDelay: '0.15s' }}
          >
            <Monitor className="size-4" />
            <span>{lessonLabel}</span>
          </div>

          <h1
            className="celebrate-rise text-3xl font-bold tracking-tight text-foreground"
            style={{ animationDelay: '0.25s' }}
          >
            Lesson complete!
          </h1>
          <p
            className="celebrate-rise mt-2 text-base text-muted-foreground"
            style={{ animationDelay: '0.35s' }}
          >
            Nice work. How was this lesson?
          </p>

          <div
            className="celebrate-rise mt-6 flex justify-center gap-1.5"
            style={{ animationDelay: '0.45s' }}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                className="rounded-lg p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-orange-400 active:scale-95"
                aria-label={`Rate ${star} star${star === 1 ? '' : 's'}`}
              >
                <Star
                  className={cn(
                    'size-9 transition-colors',
                    star <= (hoveredStar || rating)
                      ? 'fill-amber-400 text-amber-500 drop-shadow-sm'
                      : 'fill-muted text-muted-foreground/40'
                  )}
                />
              </button>
            ))}
          </div>

          <textarea
            placeholder="Share your thoughts"
            rows={4}
            value={feedbackText}
            onChange={(event) => setFeedbackText(event.target.value)}
            style={{ animationDelay: '0.55s' }}
            className="celebrate-rise mt-6 w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-relaxed text-foreground shadow-inner outline-none placeholder:text-muted-foreground focus:border-orange-400 focus:bg-card focus:ring-4 focus:ring-orange-100"
          />
        </div>
      </div>

      <div className="shrink-0 border-t border-orange-100 bg-card/90 px-4 py-3 shadow-[0_-8px_24px_-18px_rgba(0,0,0,0.25)] backdrop-blur">
        <div className="mx-auto w-full max-w-xl">
          <Button
            onClick={() => void handleContinue()}
            size="lg"
            className="w-full rounded-xl shadow-lg shadow-orange-500/20"
            disabled={busy}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
