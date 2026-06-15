import { cn } from '@shared/lib'

export interface SkillNavTab {
  id: string
  label: string
}

interface SkillCategoryTabsProps {
  tabs: SkillNavTab[]
  activeId: string
  onSelect: (id: string) => void
}

/**
 * Horizontal underline tabs for jumping between skills catalog sections.
 */
export function SkillCategoryTabs({ tabs, activeId, onSelect }: SkillCategoryTabsProps) {
  return (
    <div className="scrollbar-hide -mx-1 overflow-x-auto border-b border-border/70">
      <div className="flex min-w-max gap-1 px-1">
        {tabs.map((tab) => {
          const active = tab.id === activeId
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              className={cn(
                'relative shrink-0 px-4 py-3 text-sm font-medium transition-colors',
                active
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary transition-opacity',
                  active ? 'opacity-100' : 'opacity-0'
                )}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
