'use client'

import { useState } from 'react'
import {
  Button,
  Input,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  buttonVariants,
} from '@opencosmos/ui'
import { MoreVertical, Share2, Pencil, Trash2 } from 'lucide-react'
import { useCosmoSession, type Conversation } from './useCosmoSession'
import { ShareButton } from './ShareButton'
import { ShareDialog } from './ShareDialog'
import type { ShareConversationSnapshot } from '../../lib/share'

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function snapshotFor(conv: Conversation): ShareConversationSnapshot {
  return {
    conversationId: conv.id,
    title: conv.title,
    messages: conv.messages,
    snapshotAt: Date.now(),
  }
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
  const { conversations, currentId, startNew, openConversation, renameConversation, deleteConversation } = useCosmoSession()
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [sharingConv, setSharingConv] = useState<Conversation | null>(null)
  const [deletingConv, setDeletingConv] = useState<Conversation | null>(null)

  const handleNew = () => {
    startNew()
    onNew?.()
  }

  const handleOpen = (conv: Conversation) => {
    openConversation(conv)
    onOpen?.()
  }

  const startRename = (conv: Conversation) => {
    setRenamingId(conv.id)
    setRenameDraft(conv.title)
  }

  const commitRename = () => {
    if (renamingId) renameConversation(renamingId, renameDraft)
    setRenamingId(null)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {showNewButton && (
        <div className="px-5 pt-3 pb-2 shrink-0 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleNew}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New dialog
          </Button>
          <ShareButton className="flex-1 gap-1.5" />
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
            {conversations.map((conv) =>
              renamingId === conv.id ? (
                <div key={conv.id} className="px-5 py-1.5">
                  <Input
                    autoFocus
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename()
                      if (e.key === 'Escape') setRenamingId(null)
                    }}
                    className="h-8 text-sm"
                  />
                </div>
              ) : (
                <div key={conv.id} className="group relative">
                  <button
                    onClick={() => handleOpen(conv)}
                    className={cn(
                      'w-full text-left px-5 py-2.5 pr-10 hover:bg-foreground/10 transition-colors',
                      conv.id === currentId && 'bg-foreground/10'
                    )}
                  >
                    <p className="text-sm text-foreground/75 truncate">{conv.title}</p>
                    <p className="text-xs text-foreground/30 mt-0.5">{timeAgo(conv.updatedAt)}</p>
                  </button>

                  {/* Solid backdrop behind the trigger + an 8px feather where it meets the
                      truncated title, so the title's ellipsis never visually collides with
                      the trigger icon. Same color/visibility as the row's own hover state. */}
                  <div
                    aria-hidden
                    className="absolute right-0 top-0 bottom-0 w-9 bg-foreground/10 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none"
                  />
                  <div
                    aria-hidden
                    className="absolute right-9 top-0 bottom-0 w-2 bg-gradient-to-r from-transparent to-foreground/10 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none"
                  />

                  <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label={`Options for ${conv.title}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[160px]">
                        <DropdownMenuItem onSelect={() => setSharingConv(conv)} className="gap-2">
                          <Share2 className="w-3.5 h-3.5" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => startRename(conv)} className="gap-2">
                          <Pencil className="w-3.5 h-3.5" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => setDeletingConv(conv)}
                          className="gap-2 text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {sharingConv && (
        <ShareDialog
          open={!!sharingConv}
          onOpenChange={(open) => !open && setSharingConv(null)}
          snapshot={snapshotFor(sharingConv)}
        />
      )}

      <AlertDialog open={!!deletingConv} onOpenChange={(open) => !open && setDeletingConv(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this dialog?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingConv && `"${deletingConv.title}" will be permanently deleted. This can't be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: 'destructive' })}
              onClick={() => {
                if (deletingConv) deleteConversation(deletingConv.id)
                setDeletingConv(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
