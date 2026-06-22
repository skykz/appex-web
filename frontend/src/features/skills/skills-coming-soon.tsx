import { useEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@shared/lib'

export const COMING_SOON_SECTION_ID = 'coming-soon'

/**
 * Compact bottom-of-catalog notice — icon and copy left-aligned, fades in on scroll.
 */
export function SkillsComingSoonSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = sectionRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      id={COMING_SOON_SECTION_ID}
      className="scroll-mt-28 border-t border-border/50 pt-8 pb-2"
    >
      <div
        className={cn(
          'flex items-start gap-3 transition-all duration-500 ease-out sm:gap-4',
          visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        )}
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:size-10">
          <Sparkles className="size-4 sm:size-[18px]" strokeWidth={2.25} aria-hidden />
        </div>

        <div className="min-w-0 pt-0.5">
          <p className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
            Coming soon
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            More skills are on the way.
          </p>
        </div>
      </div>
    </section>
  )
}
