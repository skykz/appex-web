import { Bot, MessageSquare, Sparkles, Workflow } from 'lucide-react'
import { EmojiOrImageBadge } from '@shared/ui/emoji-or-image-badge'

/**
 * Skills page hero — left copy block and right decorative collage, matching the reference layout rhythm.
 */
export function SkillsHero() {
  return (
    <div className="mb-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-center lg:gap-10">
      <div className="min-w-0">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Skills
        </h1>
        <p className="mt-3 text-lg font-medium text-foreground/90 sm:text-xl">
          Master one skill per course
        </p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          A library of focused courses. Each one teaches a single, practical skill you
          can use right away.
        </p>
      </div>

      <div
        className="relative mx-auto aspect-[4/3] w-full max-w-[360px] overflow-hidden rounded-[28px] border border-border/60 bg-muted/30 shadow-sm lg:mx-0 lg:max-w-none"
        aria-hidden
      >
        <div className="absolute inset-0 bg-gradient-to-br from-muted/50 via-background to-primary/[0.06]" />

        <div className="absolute left-1/2 top-1/2 flex size-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-border/60 bg-background shadow-md">
          <EmojiOrImageBadge value="🧠" frameClassName="h-12 w-12 text-4xl" />
        </div>

        <div className="absolute left-5 top-6 flex size-11 items-center justify-center rounded-xl border border-border/50 bg-background shadow-sm">
          <EmojiOrImageBadge value="👨‍💼" frameClassName="h-8 w-8 text-2xl" />
        </div>

        <div className="absolute right-6 top-8 flex size-10 items-center justify-center rounded-full border border-border/50 bg-background shadow-sm">
          <MessageSquare className="size-4 text-primary" />
        </div>

        <div className="absolute bottom-10 left-8 flex size-10 items-center justify-center rounded-full border border-border/50 bg-background shadow-sm">
          <Bot className="size-4 text-violet-500" />
        </div>

        <div className="absolute bottom-8 right-10 flex size-11 items-center justify-center rounded-xl border border-border/50 bg-background shadow-sm">
          <Workflow className="size-4 text-sky-500" />
        </div>

        <div className="absolute right-16 top-1/2 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
          <Sparkles className="size-4" />
        </div>

        <div className="absolute bottom-16 left-1/2 flex size-9 -translate-x-1/2 items-center justify-center rounded-full border border-border/50 bg-background text-lg shadow-sm">
          ✨
        </div>
      </div>
    </div>
  )
}
