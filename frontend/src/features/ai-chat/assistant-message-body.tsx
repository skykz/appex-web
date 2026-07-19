import type { Components } from 'react-markdown'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@shared/lib'

interface AssistantMessageBodyProps {
  /** Raw assistant markdown (fenced code, lists, bold, etc.). */
  text: string
}

/**
 * Renders assistant reply as GitHub-flavored markdown without executing HTML.
 */
export function AssistantMessageBody({ text }: AssistantMessageBodyProps) {
  const components: Components = {
    /** Block paragraphs with comfortable spacing. */
    p({ children }) {
      return <p className="mb-2 last:mb-0">{children}</p>
    },
    /** Unordered lists for bullet answers. */
    ul({ children }) {
      return <ul className="mb-2 list-disc pl-5 last:mb-0">{children}</ul>
    },
    /** Ordered lists for step-by-step answers. */
    ol({ children }) {
      return <ol className="mb-2 list-decimal pl-5 last:mb-0">{children}</ol>
    },
    /** List item spacing. */
    li({ children }) {
      return <li className="mb-1">{children}</li>
    },
    /** Section headings inside long replies. */
    h2({ children }) {
      return (
        <h2 className="mb-2 mt-4 text-base font-semibold first:mt-0">
          {children}
        </h2>
      )
    },
    h3({ children }) {
      return (
        <h3 className="mb-1.5 mt-3 text-sm font-semibold first:mt-0">
          {children}
        </h3>
      )
    },
    /** Fenced code blocks: full-width scroll on small screens. */
    pre({ children }) {
      return (
        <pre className="mb-2 max-w-full overflow-x-auto rounded-lg bg-muted/80 p-3 text-sm last:mb-0">
          {children}
        </pre>
      )
    },
    /** Inline code vs fenced `language-*` spans inside `pre`. */
    code({ className, children, ...rest }) {
      const isFence = Boolean(className?.startsWith('language-'))
      return (
        <code
          className={cn(
            'font-mono text-[13px]',
            isFence
              ? cn('block w-full whitespace-pre text-sm', className)
              : 'rounded bg-muted/80 px-1 py-0.5'
          )}
          {...rest}
        >
          {children}
        </code>
      )
    },
    /** Links open in a new tab for citations. */
    a({ href, children }) {
      return (
        <a
          href={href}
          className="text-primary underline underline-offset-2 hover:no-underline"
          target="_blank"
          rel="noreferrer noopener"
        >
          {children}
        </a>
      )
    },
    strong({ children }) {
      return <strong className="font-semibold">{children}</strong>
    },
  }

  return (
    <div className="min-w-0 break-words">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>{text}</Markdown>
    </div>
  )
}
