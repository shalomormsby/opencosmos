'use client'

import { useState } from 'react'
import { Button } from '@opencosmos/ui'
import { Share2 } from 'lucide-react'
import { useCosmoSession } from './useCosmoSession'
import { ShareDialog } from './ShareDialog'
import type { ShareConversationSnapshot } from '../../lib/share'

/**
 * Self-contained Share trigger + dialog. Reads the current conversation from
 * `useCosmoSession`, builds the snapshot lazily on click, manages its own
 * dialog open state. Drop in anywhere within the dialog page.
 *
 * Disabled when there's no assistant reply yet (nothing meaningful to share).
 */
export function ShareButton({ className }: { className?: string }) {
  const { messages, currentId } = useCosmoSession()
  const [open, setOpen] = useState(false)

  const canShare = messages.some((m) => m.role === 'assistant' && m.content.trim().length > 0)

  const buildSnapshot = (): ShareConversationSnapshot => {
    // Excludes the streaming-tail empty assistant message that appears mid-response.
    const trimmed = messages.filter(
      (m, i) => !(i === messages.length - 1 && m.role === 'assistant' && !m.content),
    )
    const firstUser = trimmed.find((m) => m.role === 'user')
    const title = firstUser
      ? firstUser.content.length > 50
        ? firstUser.content.slice(0, 50) + '…'
        : firstUser.content
      : 'New conversation'
    return {
      conversationId: currentId,
      title,
      messages: trimmed,
      snapshotAt: Date.now(),
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
        disabled={!canShare}
        aria-label="Share this conversation"
      >
        <Share2 className="w-3.5 h-3.5" />
        Share
      </Button>

      {open && (
        <ShareDialog open={open} onOpenChange={setOpen} snapshot={buildSnapshot()} />
      )}
    </>
  )
}
