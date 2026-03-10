import { useState } from 'react'
import { Star, Monitor } from 'lucide-react'
import { cn } from '@shared/lib'
import { Button } from '@shared/ui'

interface LessonCompleteScreenProps {
  lessonLabel: string
  onContinue: () => void
}

export function LessonCompleteScreen({
  lessonLabel,
  onContinue,
}: LessonCompleteScreenProps) {
  const [rating, setRating] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Content — vertically centered */}
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="flex w-full max-w-md flex-col items-center text-center">
          {/* Badge icon */}
          <div className="mb-6 text-7xl">🏆</div>

          {/* Lesson label */}
          <div className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Monitor className="size-4" />
            <span>{lessonLabel}</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold">Lesson complete!</h1>
          <p className="mt-1.5 text-muted-foreground">Excellent work today!</p>

          {/* Star rating */}
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

          {/* Feedback textarea */}
          <textarea
            placeholder="Share your thoughts"
            rows={4}
            className="mt-5 w-full resize-none rounded-xl bg-muted/50 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="sticky bottom-0 border-t bg-background px-4 py-4">
        <div className="mx-auto w-full max-w-2xl">
          <Button
            onClick={onContinue}
            size="xl"
            className="w-full"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}
