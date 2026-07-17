import type { ReactElement, SVGProps } from 'react'
import { Bot } from 'lucide-react'
import { cn } from '@shared/lib'

/**
 * Brand marks for each chat model. Each is a monochrome SVG that inherits color
 * via `currentColor` so it themes with the surrounding text (light/dark).
 *
 * How to add or change a model icon:
 * 1. Add a component below returning an <svg> using `fill="currentColor"`.
 * 2. Register it in `MODEL_ICONS` keyed by the model `id` from `GET /chat/models`.
 * 3. If the id is missing here, `AIModelIcon` falls back to a neutral bot glyph.
 */

type BrandIcon = (props: SVGProps<SVGSVGElement>) => ReactElement

/** OpenAI mark — used for ChatGPT (text) and ChatGPT Image. */
function OpenAIIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22.28 9.82a5.98 5.98 0 0 0-.52-4.91 6.05 6.05 0 0 0-6.51-2.9A6.07 6.07 0 0 0 4.98 4.18a5.98 5.98 0 0 0-3.99 2.9 6.05 6.05 0 0 0 .74 7.1 5.98 5.98 0 0 0 .52 4.9 6.05 6.05 0 0 0 6.51 2.9A5.98 5.98 0 0 0 13.26 24a6.06 6.06 0 0 0 5.77-4.21 5.99 5.99 0 0 0 4-2.9 6.06 6.06 0 0 0-.75-7.07Zm-9.02 12.6a4.48 4.48 0 0 1-2.88-1.04l.14-.08 4.78-2.76a.79.79 0 0 0 .39-.68v-6.74l2.02 1.17a.07.07 0 0 1 .04.05v5.58a4.5 4.5 0 0 1-4.5 4.5ZM3.6 18.3a4.47 4.47 0 0 1-.54-3.01l.14.08 4.78 2.76a.77.77 0 0 0 .78 0l5.84-3.37v2.33a.07.07 0 0 1-.03.06L9.73 21a4.5 4.5 0 0 1-6.14-1.65Zm-1.26-10.4a4.48 4.48 0 0 1 2.34-1.97v5.68a.77.77 0 0 0 .39.68l5.83 3.36-2.02 1.17a.07.07 0 0 1-.07 0l-4.83-2.79a4.5 4.5 0 0 1-1.65-6.14Zm16.6 3.86-5.84-3.37 2.02-1.16a.07.07 0 0 1 .07 0l4.83 2.78a4.5 4.5 0 0 1-.68 8.11v-5.68a.79.79 0 0 0-.4-.68Zm2.01-3.02-.14-.09-4.77-2.77a.78.78 0 0 0-.79 0L9.62 9.6V7.27a.07.07 0 0 1 .03-.06l4.83-2.79a4.5 4.5 0 0 1 6.68 4.66ZM8.52 12.86 6.5 11.7a.07.07 0 0 1-.04-.06V6.07a4.5 4.5 0 0 1 7.38-3.45l-.14.08-4.78 2.76a.79.79 0 0 0-.39.68l-.01 6.72Zm1.1-2.36L12.22 9l2.61 1.5v3l-2.6 1.5-2.61-1.5v-3Z" />
    </svg>
  )
}

/** DeepSeek whale mark. */
function DeepSeekIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M23.75 4.63c-.26-.13-.37.12-.52.24-.05.04-.1.09-.14.14-.4.42-.86.7-1.46.66-.88-.05-1.63.22-2.29.9-.14-.83-.6-1.32-1.3-1.64-.37-.16-.74-.33-1-.68-.18-.25-.23-.53-.32-.8-.06-.17-.11-.34-.3-.37-.2-.03-.29.14-.37.29-.32.6-.45 1.26-.44 1.94.03 1.51.66 2.72 1.92 3.58.14.1.18.2.13.34-.08.29-.19.57-.28.86-.06.19-.15.23-.35.15a5.63 5.63 0 0 1-1.83-1.24C13.62 7.5 12.7 6.4 11.55 5.5a11.4 11.4 0 0 0-.68-.5c-.98-.94.13-1.72.38-1.81.27-.1.1-.43-.76-.43-.87.01-1.66.3-2.67.69-.15.06-.3.1-.46.14a8.9 8.9 0 0 0-2.7-.1C2.87 3.4 1.36 4.42.5 6.28c-1.04 2.24-.77 4.4.54 6.46.94 1.47 2.27 2.5 3.83 3.22.13.06.19.13.16.28-.06.36-.13.72-.16 1.09-.05.6.02.75.62.87.44.09.9.11 1.34.2.86.16 1.15.68.9 1.5-.1.34-.15.65-.03.98.14.42.5.62.98.55.5-.08.85-.4 1.13-.79.42-.6.53-1.28.53-1.98v-.34c0-.36.08-.44.44-.35.5.13.98.2 1.5.16.71-.06 1.35-.22 1.9-.75.14-.14.29-.28.5-.35.34-.11.5.05.44.4-.06.35-.28.62-.5.9-.32.4-.7.75-.87 1.24-.15.4-.11.6.22.85.32.24.68.19 1.03.03.83-.4 1.45-1 1.98-1.72.32-.44.6-.9.83-1.4.4-.85.66-1.75.85-2.68l.03-.27c.24-1 .12-1.98-.42-2.87-.14-.23-.2-.4.02-.63.1-.11.22-.24.32-.38.29-.4.5-.86.65-1.34.1-.31.14-.62.03-.94Z" />
    </svg>
  )
}

/** Anthropic mark — used for Claude. */
function ClaudeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M4.71 15.14 9.4 12.5l.08-.23-.08-.13H9.2l-.79-.05-2.69-.07-2.33-.1-2.26-.12-.57-.12L0 11.1l.05-.35.48-.32.68.06 1.52.1 2.27.16 1.65.1 2.44.25h.39l.05-.16-.13-.1-.1-.1-2.35-1.6-2.55-1.68-1.33-.97-.72-.49-.37-.46-.16-1.01.66-.73.88.06.23.06.9.7 1.9 1.47 2.5 1.83.36.3.14-.1.02-.07-.16-.27-1.35-2.43-1.44-2.48-.64-1.03-.17-.62a3 3 0 0 1-.1-.72l.75-1.02L2.72 0l1 .13.41.36.62 1.42 1 2.22 1.55 3.03.46.9.24.83.09.26h.16V9.6l.13-1.72.24-2.11.23-2.72.08-.76.38-.92.75-.5.6.28.48.7-.07.44-.29 1.87-.56 2.92-.37 1.95h.22l.24-.25 1-1.31 1.66-2.08.73-.82.86-.92.55-.43h1.04l.77 1.14-.35 1.18-1.07 1.36-.89 1.15-1.28 1.72-.8 1.37.08.11.19-.02 2.85-.6 1.53-.29 1.84-.31.83.39.09.39-.33.8-1.96.49-2.3.46-3.42.8-.05.04.05.07 1.54.14.66.04h1.61l3 .22.79.52.47.64-.08.48-1.2.62-1.64-.4-3.82-.9-1.3-.33h-.19v.11l1.1 1.06 2 1.81 2.51 2.34.13.58-.32.45-.34-.05-2.19-1.65-.85-.74-1.9-1.6h-.13v.17l.44.64 2.32 3.48.12 1.07-.17.35-.6.2-.65-.11-1.36-1.9-1.4-2.14-1.12-1.92-.14.08-.66 7.14-.31.36-.72.28-.6-.46-.31-.73.3-1.4.37-1.82.3-1.44.27-1.79.16-.6-.01-.03h-.13l-1.36 1.86-2.06 2.79-1.64 1.75-.39.15-.68-.35.06-.63.38-.55 2.26-2.88 1.36-1.78.88-1.03-.01-.14h-.06L4.53 18.7l-1.28.17-.55-.52.07-.84.26-.28 2.16-1.48Z" />
    </svg>
  )
}

/** Google Gemini spark — used for the "Nano Banana" image model. */
function GeminiIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 0c.28 6.34 5.66 11.72 12 12-6.34.28-11.72 5.66-12 12-.28-6.34-5.66-11.72-12-12C6.34 11.72 11.72 6.34 12 0Z" />
    </svg>
  )
}

/** Stability AI mark — used for Stable Diffusion. */
function StableDiffusionIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M8.36 19.2c3.63 0 6.06-1.9 6.06-4.82 0-2.23-1.49-3.62-4.24-4.24l-1.9-.43c-1.36-.31-2.02-.79-2.02-1.65 0-.92.83-1.5 2.32-1.5 1.62 0 3.36.56 4.94 1.42V4.6A11.2 11.2 0 0 0 8.7 3.6C5.3 3.6 3 5.44 3 8.3c0 2.23 1.4 3.66 4.05 4.26l1.9.44c1.47.34 2.16.82 2.16 1.72 0 1-.9 1.62-2.53 1.62-1.86 0-3.86-.72-5.58-1.86v3.02c1.5.9 3.5 1.68 5.36 1.68ZM19.5 19.2a2.1 2.1 0 1 0 0-4.2 2.1 2.1 0 0 0 0 4.2Z" />
    </svg>
  )
}

/** Perplexity mark. */
function PerplexityIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22.398 8.024h-3.42V2.19l-5.986 5.32V2.196h-1.984v5.315L5.022 2.19v5.834h-3.42v7.936h1.983v5.85l6.083-5.407v5.4h1.984v-5.4l6.083 5.407v-5.85h1.983V8.024h-.001Zm-9.406-1.485 3.65-3.244v3.244h-3.65Zm-5.634-3.244 3.65 3.244h-3.65V3.295ZM3.585 14.475v-4.467h4.982l-4.982 4.467Zm7.418 4.79-4.099 3.644v-6.372l4.099-3.643v6.371Zm0-8.696L6.9 6.804h4.103v3.765Zm1.984 0V6.804h4.104l-4.104 3.765Zm4.099 12.34-4.099-3.644v-6.371l4.099 3.643v6.372Zm2.313-8.434-4.982-4.467h4.982v4.467Z" />
    </svg>
  )
}

const MODEL_ICONS: Record<string, BrandIcon> = {
  chatgpt: OpenAIIcon,
  'chatgpt-image': OpenAIIcon,
  deepseek: DeepSeekIcon,
  claude: ClaudeIcon,
  'nano-banana': GeminiIcon,
  'stable-diffusion': StableDiffusionIcon,
  perplexity: PerplexityIcon,
}

interface AIModelIconProps {
  modelId: string
  className?: string
}

/**
 * Renders the brand icon for a chat model id returned by the API.
 */
export function AIModelIcon({ modelId, className }: AIModelIconProps) {
  const Icon = MODEL_ICONS[modelId]
  if (!Icon) {
    return (
      <Bot
        className={cn('size-4 shrink-0 text-muted-foreground', className)}
        aria-hidden
      />
    )
  }
  return <Icon className={cn('size-4 shrink-0', className)} aria-hidden="true" />
}
