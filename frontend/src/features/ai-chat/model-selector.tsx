import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@shared/lib'
import type { AIModel } from './types'
import { AIModelIcon } from './model-icons'

interface ModelSelectorProps {
  models: AIModel[]
  value: AIModel
  onChange: (model: AIModel) => void
  disabled?: boolean
}

/**
 * Compact dropdown for switching the active chat model within the composer.
 */
export function ModelSelector({
  models,
  value,
  onChange,
  disabled = false,
}: ModelSelectorProps) {
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
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className={cn(
          'inline-flex items-center gap-2 rounded-full px-3 py-1.5',
          'text-sm font-medium text-muted-foreground',
          'bg-muted/60 transition-all duration-200',
          'hover:bg-muted active:scale-95'
        )}
      >
        <AIModelIcon modelId={value.id} className="size-3.5" />
        <span>{value.name}</span>
        <ChevronDown
          className={cn(
            'size-3.5 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-[220] mb-2 w-56 overflow-hidden rounded-xl border-2 border-border bg-popover text-popover-foreground shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
          <div className="border-b px-4 py-2.5">
            <span className="text-xs font-medium text-muted-foreground">
              Select LLM
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto p-1.5">
            {models.map((model) => (
              <button
                key={model.id}
                type="button"
                onClick={() => {
                  onChange(model)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  'hover:bg-muted/70',
                  model.id === value.id
                    ? 'bg-primary/10 text-foreground ring-1 ring-primary/20'
                    : 'text-foreground'
                )}
              >
                <AIModelIcon modelId={model.id} />
                <span className="flex-1 text-left font-medium">
                  {model.name}
                </span>
                {model.id === value.id && (
                  <Check className="size-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
