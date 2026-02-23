import { Link } from 'react-router-dom'
import { cn } from '@shared/lib'
import type { Skill } from './mock-data'

interface SkillCardProps {
  skill: Skill
}

export function SkillCard({ skill }: SkillCardProps) {
  return (
    <Link
      to={`/skills/${skill.id}`}
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl border border-dashed border-border/60',
        'bg-card text-left transition-all duration-200',
        'hover:border-primary/40 hover:shadow-md active:scale-[0.98]'
      )}
    >
      {/* Emoji icon area */}
      <div className="relative flex h-40 items-center justify-center bg-muted/50">
        <span className="text-6xl">{skill.emoji}</span>

        {/* Progress / Completed badge */}
        {skill.status === 'completed' ? (
          <span className="absolute left-3 top-3 rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-semibold text-green-600">
            Completed
          </span>
        ) : skill.progress > 0 ? (
          <span className="absolute left-3 top-3 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {skill.progress}%
          </span>
        ) : null}
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="font-semibold leading-tight">{skill.title}</h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {skill.description}
        </p>
      </div>
    </Link>
  )
}
