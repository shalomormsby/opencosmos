'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeSlug from 'rehype-slug'
import { cn } from '@opencosmos/ui'

// Formats where a single newline is an intentional line break (verse, poetry,
// scripture). remark-breaks renders these as <br> instead of collapsing them
// into spaces the way standard Markdown does.
const VERSE_FORMATS = new Set(['scripture', 'poetry', 'anthology'])

type Props = {
  content: string
  format?: string
}

export default function DocViewer({ content, format }: Props) {
  const useBreaks = format ? VERSE_FORMATS.has(format) : false
  return (
    <ReactMarkdown
      remarkPlugins={useBreaks ? [remarkGfm, remarkBreaks] : [remarkGfm]}
      rehypePlugins={[rehypeSlug]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-2xl font-light text-foreground mt-10 mb-4 leading-tight">
            {children}
          </h1>
        ),
        h2: ({ children, id }) => (
          <h2 id={id} className="text-xl font-light text-foreground mt-10 mb-3 leading-snug scroll-mt-28">
            {children}
          </h2>
        ),
        h3: ({ children, id }) => (
          <h3 id={id} className="text-base font-medium text-foreground mt-8 mb-2 scroll-mt-28">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-foreground/70 leading-relaxed mb-5">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-outside pl-5 mb-5 space-y-1.5">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-outside pl-5 mb-5 space-y-1.5">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-foreground/70 leading-relaxed">{children}</li>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-foreground/20 pl-5 my-6 text-foreground/50 italic">
            {children}
          </blockquote>
        ),
        pre: ({ children }) => (
          <pre className="bg-foreground/5 rounded-lg p-4 overflow-x-auto mb-5 text-sm">
            {children}
          </pre>
        ),
        code: ({ className, children }) => {
          const isBlock = Boolean(className?.startsWith('language-'))
          return (
            <code
              className={cn(
                'font-mono text-foreground/70',
                isBlock ? className : 'px-1.5 py-0.5 rounded text-xs bg-foreground/5'
              )}
            >
              {children}
            </code>
          )
        },
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-foreground underline underline-offset-2 hover:text-foreground/60 transition-colors"
            target={href?.startsWith('http') ? '_blank' : undefined}
            rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
          >
            {children}
          </a>
        ),
        hr: () => <hr className="my-10 border-foreground/10" />,
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        table: ({ children }) => (
          <div className="overflow-x-auto mb-5">
            <table className="w-full text-sm text-left border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="border-b border-foreground/10">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="py-2 pr-6 font-medium text-foreground/60 text-xs uppercase tracking-wide">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="py-2 pr-6 text-foreground/70 border-b border-foreground/5">
            {children}
          </td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
