import { cn } from '@shared/lib'
import { skillCategories, type SkillCategoryFilter } from './types'

interface SkillCategoryTabsProps {
  value: SkillCategoryFilter
  onChange: (category: SkillCategoryFilter) => void
}

export function SkillCategoryTabs({ value, onChange }: SkillCategoryTabsProps) {
  return (
    <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
      {skillCategories.map((cat) => (
        <button
          key={cat.value}
          type="button"
          onClick={() => onChange(cat.value)}
          className={cn(
            'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200',
            value === cat.value
              ? 'bg-foreground text-background shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          {cat.label}
        </button>
      ))}
    </div>
  )
}
