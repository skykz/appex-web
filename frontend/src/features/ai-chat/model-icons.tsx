import type { LucideIcon } from 'lucide-react'
import {
  Bot,
  Code2,
  Compass,
  ImageIcon,
  Cpu,
  Palette,
  Sparkles,
} from 'lucide-react'
import { cn } from '@shared/lib'

/**
 * Maps each chat `modelId` from the API to a Lucide icon (no emoji in UI).
 *
 * How to add or change a model icon:
 * 1. Import an icon from `lucide-react` (pick a simple outline style).
 * 2. Add a row: `[your-model-id]: YourIcon` (id must match `GET /chat/models`).
 * 3. If the id is missing here, `AIModelIcon` falls back to `Bot`.
 */
const MODEL_ICONS: Record<string, LucideIcon> = {
  chatgpt: Bot,
  'chatgpt-image': ImageIcon,
  deepseek: Code2,
  claude: Sparkles,
  'nano-banana': Cpu,
  'stable-diffusion': Palette,
  perplexity: Compass,
}

interface AIModelIconProps {
  modelId: string
  className?: string
}

/**
 * Renders the professional icon for a chat model id returned by the API.
 */
export function AIModelIcon({ modelId, className }: AIModelIconProps) {
  const Icon = MODEL_ICONS[modelId] ?? Bot
  return (
    <Icon
      className={cn('size-4 shrink-0 text-muted-foreground', className)}
      aria-hidden
    />
  )
}
