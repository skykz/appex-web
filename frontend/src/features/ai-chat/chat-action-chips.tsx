import {
  HelpCircle,
  Lightbulb,
  Languages,
  AlignLeft,
  FileText,
  PenLine,
} from 'lucide-react'
import { cn } from '@shared/lib'
import { actionChips } from './constants'

const iconMap: Record<string, React.ElementType> = {
  'help-circle': HelpCircle,
  lightbulb: Lightbulb,
  languages: Languages,
  'align-left': AlignLeft,
  'file-text': FileText,
  'pen-line': PenLine,
}

interface ChatActionChipsProps {
  onChipClick?: (label: string) => void
}

export function ChatActionChips({ onChipClick }: ChatActionChipsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {actionChips.map((chip) => {
        const Icon = iconMap[chip.icon]
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => onChipClick?.(chip.label)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2',
              'text-sm font-medium text-muted-foreground',
              'transition-all duration-200',
              'hover:border-primary/40 hover:bg-primary/[0.04] hover:text-foreground active:scale-95'
            )}
          >
            {Icon && <Icon className="size-4 text-primary/70" />}
            <span>{chip.label}</span>
          </button>
        )
      })}
    </div>
  )
}
