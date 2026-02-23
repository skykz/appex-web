import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@shared/lib'
import { aiModels, type AIModel } from './mock-data'

interface ModelSelectorProps {
  value: AIModel
  onChange: (model: AIModel) => void
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5',
          'text-sm font-medium text-muted-foreground',
          'bg-muted/60 transition-all duration-200',
          'hover:bg-muted active:scale-95'
        )}
      >
        <span>{value.name}</span>
        <ChevronDown
          className={cn(
            'size-3.5 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-56 overflow-hidden rounded-xl border bg-background shadow-lg">
          {/* Header */}
          <div className="border-b px-4 py-2.5">
            <span className="text-xs font-medium text-muted-foreground">
              Select LLM
            </span>
          </div>

          {/* Scrollable model list */}
          <div className="max-h-72 overflow-y-auto p-1.5">
            {aiModels.map((model) => (
              <button
                key={model.id}
                type="button"
                onClick={() => {
                  onChange(model)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  'hover:bg-muted',
                  model.id === value.id && 'bg-muted/60'
                )}
              >
                <span className="text-base">{model.icon}</span>
                <span className="flex-1 text-left font-medium">
                  {model.name}
                </span>
                {model.id === value.id && (
                  <Check className="size-4 text-foreground" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
