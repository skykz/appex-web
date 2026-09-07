import type { SkillCardModel } from './types'
import { SkillCard } from './skill-card'

interface SkillsFeaturedPanelProps {
  skills: SkillCardModel[]
}

/** A short curated strip that gives learners a quick view of available courses. */
export function SkillsFeaturedPanel({ skills }: SkillsFeaturedPanelProps) {
  if (!skills.length) return null

  return (
    <section className="rounded-[28px] bg-muted/50 p-6 sm:p-7">
      <div className="grid gap-6 lg:grid-cols-[minmax(220px,0.9fr)_minmax(0,1.1fr)] lg:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Featured skills</h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-base">
            Selected courses to help you build practical AI skills, one focused lesson at a time.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {skills.slice(0, 3).map((skill) => (
            <SkillCard key={skill.id} skill={skill} compact />
          ))}
        </div>
      </div>
    </section>
  )
}
