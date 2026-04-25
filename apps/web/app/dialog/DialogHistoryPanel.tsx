'use client'

import { Button, cn } from '@opencosmos/ui'
import { useCosmoSession, type Conversation } from './useCosmoSession'

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

type Props = {
  /** Show the "+ New dialog" button at the top. Defaults to true (Dialog-tab placement). */
  showNewButton?: boolean
  /** Called after a conversation is opened — useful for switching tabs after a selection. */
  onOpen?: () => void
  /** Called after New Dialog is clicked — useful for switching tabs after starting fresh. */
  onNew?: () => void
}

export function DialogHistoryPanel({ showNewButton = true, onOpen, onNew }: Props) {
  const { conversations, currentId, startNew, openConversation } = useCosmoSession()

  const handleNew = () => {
    startNew()
    onNew?.()
  }

  const handleOpen = (conv: Conversation) => {
    openConversation(conv)
    onOpen?.()
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {showNewButton && (
        <div className="px-5 pt-3 pb-2 shrink-0">
          <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={handleNew}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New dialog
          </Button>
        </div>
      )}

      <div className="px-5 pb-1 shrink-0">
        <p className="text-xs uppercase tracking-widest text-foreground/25">Your dialogs</p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {conversations.length === 0 ? (
          <p className="text-xs text-foreground/30 text-center py-8 px-5">
            No previous dialogs.
          </p>
        ) : (
          <div className="py-1">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleOpen(conv)}
                className={cn(
                  'w-full text-left px-5 py-2.5 hover:bg-foreground/5 transition-colors',
                  conv.id === currentId && 'bg-foreground/5'
                )}
              >
                <p className="text-sm text-foreground/75 truncate">{conv.title}</p>
                <p className="text-xs text-foreground/30 mt-0.5">{timeAgo(conv.updatedAt)}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
