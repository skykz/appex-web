import { useState } from 'react'
import { BookOpen, Loader2, Star } from 'lucide-react'
import { cn } from '@shared/lib'
import { Button } from '@shared/ui'

/** Quick feedback tags shown after the learner picks a star rating. */
const MODULE_FEEDBACK_TAGS = [
  'Content was unclear',
  'Too easy',
  'Too hard',
  'Not practical enough',
  'Pace was too slow',
  'Other',
] as const

export interface ModuleFeedbackPayload {
  rating?: number
  feedback?: string
}

interface ModuleCompleteScreenProps {
  moduleLabel: string
  moduleTitle?: string
  /** Persists completion and advances the flow (streak screen or exit). */
  onContinue: (payload: ModuleFeedbackPayload) => void | Promise<void>
}

/**
 * Post-module celebration and feedback — distinct from the lesson-complete screen (stars + tag pills, no textarea).
 */
export function ModuleCompleteScreen({
  moduleLabel,
  moduleTitle,
  onContinue,
}: ModuleCompleteScreenProps) {
  const [rating, setRating] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const activeStars = hoveredStar || rating
  const showTagStep = rating > 0

  /**
   * Toggles one quick-feedback tag in the multi-select list.
   */
  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    )
  }

  /**
   * Sends rating + optional tags to the parent before streak or navigation.
   * When no rating is given, the learner can skip and still advance.
   */
  async function handleContinue() {
    if (busy) return
    setBusy(true)
    try {
      const feedback =
        rating >= 1 && selectedTags.length > 0
          ? `Tags: ${selectedTags.join(', ')}`
          : undefined
      // Skipping (no stars) sends no rating, so a skip isn't recorded as a real score.
      await onContinue({ rating: rating > 0 ? rating : undefined, feedback })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-muted/30">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card px-6 py-8 text-center shadow-lg shadow-black/[0.04] sm:px-8 sm:py-9">
          <div className="mx-auto mb-5 flex size-[4.5rem] items-center justify-center text-5xl sm:size-20 sm:text-6xl">
            <span role="img" aria-hidden>
              🏆
            </span>
          </div>

          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold text-white shadow-sm">
            <BookOpen className="size-3.5" strokeWidth={2.25} aria-hidden />
            <span>{moduleLabel}</span>
          </div>

          {moduleTitle ? (
            <p className="mb-1 text-sm font-medium text-muted-foreground">{moduleTitle}</p>
          ) : null}

          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Module complete!
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            How did you like this module?
          </p>

          <div className="mt-6 flex justify-center gap-1 sm:gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                className="rounded-lg p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/40 active:scale-95"
                aria-label={`Rate ${star} star${star === 1 ? '' : 's'}`}
              >
                <Star
                  className={cn(
                    'size-10 transition-colors sm:size-11',
                    star <= activeStars
                      ? 'fill-amber-400 text-amber-500 drop-shadow-sm'
                      : 'fill-muted text-muted-foreground/35'
                  )}
                />
              </button>
            ))}
          </div>

          {showTagStep ? (
            <div className="mt-7 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <p className="text-sm font-medium text-foreground">
                Thanks! Why did you choose this rating?
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {MODULE_FEEDBACK_TAGS.map((tag) => {
                  const selected = selectedTags.includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        'rounded-full border px-3.5 py-2 text-sm font-medium transition-colors',
                        selected
                          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                          : 'border-border bg-muted/50 text-foreground hover:bg-muted'
                      )}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-2">
          <Button
            onClick={() => void handleContinue()}
            size="lg"
            className="w-full rounded-xl"
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
          {!showTagStep ? (
            <p className="text-xs text-muted-foreground">
              Rating is optional — tap Continue to move on.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
