import { useState } from 'react'
import { Star, Monitor, Loader2 } from 'lucide-react'
import { cn } from '@shared/lib'
import { Button } from '@shared/ui'

interface LessonCompleteScreenProps {
  lessonLabel: string
  /** Runs when the learner leaves feedback (rating optional); may show streak next depending on result. */
  onContinue: () => void | Promise<void>
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
  const [busy, setBusy] = useState(false)

  /**
   * Awaits persistence (lesson complete + streak check-in) before the parent advances the flow.
   */
  async function handleContinue() {
    if (busy) return
    setBusy(true)
    try {
      await onContinue()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-6">
        <div className="flex w-full max-w-md flex-col items-center text-center">
          <div className="mb-6 text-7xl">🏆</div>

          <div className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Monitor className="size-4" />
            <span>{lessonLabel}</span>
          </div>

          <h1 className="text-2xl font-bold">Lesson complete!</h1>
          <p className="mt-1.5 text-muted-foreground">Excellent work today!</p>

          <div className="mt-5 flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                className="p-0.5 transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  className={cn(
                    'size-8 transition-colors',
                    star <= (hoveredStar || rating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'fill-muted text-muted'
                  )}
                />
              </button>
            ))}
          </div>

          <textarea
            placeholder="Share your thoughts"
            rows={4}
            className="mt-5 w-full resize-none rounded-xl bg-muted/50 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="shrink-0 border-t bg-background px-4 py-4">
        <div className="mx-auto w-full max-w-2xl">
          <Button
            onClick={() => void handleContinue()}
            size="xl"
            className="w-full"
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
