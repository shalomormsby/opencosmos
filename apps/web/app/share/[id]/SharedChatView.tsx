'use client'

import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Link from 'next/link'
import { Button, cn } from '@opencosmos/ui'
import type { ShareConversationSnapshot } from '../../../lib/share'

const chatMarkdownComponents: Components = {
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      className="underline underline-offset-2 hover:text-foreground/60 transition-colors"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="list-disc list-outside pl-5 mb-3 last:mb-0 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-outside pl-5 mb-3 last:mb-0 space-y-1">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-foreground/20 pl-4 my-3 text-foreground/70 italic">
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => {
    const isBlock = Boolean(className?.startsWith('language-'))
    return (
      <code className={cn('font-mono', isBlock ? className : 'px-1 py-0.5 rounded text-xs bg-foreground/5')}>
        {children}
      </code>
    )
  },
  pre: ({ children }) => (
    <pre className="bg-foreground/5 rounded-lg p-3 overflow-x-auto mb-3 last:mb-0 text-xs">{children}</pre>
  ),
  h1: ({ children }) => <h1 className="text-base font-semibold mt-3 mb-2 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-sm font-semibold mt-3 mb-2 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-medium mt-2 mb-1 first:mt-0">{children}</h3>,
  hr: () => <hr className="my-4 border-foreground/10" />,
}

interface SharedChatViewProps {
  snapshot: ShareConversationSnapshot
  visibility: 'public' | 'private'
  isOwner: boolean
}

export function SharedChatView({ snapshot, visibility, isOwner }: SharedChatViewProps) {
  const sharedDate = new Date(snapshot.snapshotAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header banner */}
        <div className="border-b border-foreground/10 pb-6 mb-8">
          <div className="flex items-center justify-between gap-4 mb-2">
            <Link
              href="/"
              className="text-sm font-bold tracking-tight text-foreground hover:text-foreground/70 transition-colors"
            >
              OpenCosmos
            </Link>
            <span className="text-xs text-foreground/40 uppercase tracking-wider">
              {visibility === 'private' ? 'Private share' : 'Shared chat'}
            </span>
          </div>
          <h1 className="text-2xl font-light text-foreground mb-1">{snapshot.title}</h1>
          <p className="text-xs text-foreground/40">Shared on {sharedDate}</p>
        </div>

        {/* Messages */}
        <div className="space-y-8 pb-20">
          {snapshot.messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex flex-col gap-1.5',
                msg.role === 'user' ? 'items-end' : 'items-start',
              )}
            >
              <span className="text-xs text-foreground/25 px-1">
                {msg.role === 'user' ? 'You' : 'Cosmo'}
              </span>
              <div
                className={cn(
                  'rounded-2xl px-5 py-4 text-sm leading-relaxed max-w-prose',
                  msg.role === 'user'
                    ? 'bg-foreground/8 text-foreground whitespace-pre-wrap'
                    : 'border border-foreground/10 text-foreground',
                )}
              >
                {msg.role === 'assistant' ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={chatMarkdownComponents}>
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="border-t border-foreground/10 pt-6 flex flex-col items-center gap-3 text-center">
          <p className="text-xs text-foreground/40">
            Want to start your own conversation with Cosmo?
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/">Try OpenCosmos</Link>
          </Button>
          {isOwner && (
            <p className="text-xs text-foreground/30 mt-2">
              You created this share. Manage it from the chat.
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
