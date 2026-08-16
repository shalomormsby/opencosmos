'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Link from 'next/link'
import { Button, cn } from '@opencosmos/ui'
import type { ShareConversationSnapshot } from '../../../lib/share'
// This view had its own byte-identical copy of the component map, minus the
// citation-aware `a` renderer — a copy made before citations.tsx was extracted.
// The consequence was that shared conversations printed Cosmo's citation tokens
// as literal "[ref: knowledge/sources/…]" text in the prose, on the one surface
// that is public. Importing the shared map keeps every renderer honest.
import { chatMarkdownComponents, citationUrlTransform, preprocessCitations } from '../../dialog/citations'
import { stripXensoState } from '../../dialog/xenso-state'

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
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={chatMarkdownComponents} urlTransform={citationUrlTransform}>
                    {preprocessCitations(stripXensoState(msg.content))}
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
