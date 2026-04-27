'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  cn,
} from '@opencosmos/ui'
import { Check, Copy, Globe, Lock } from 'lucide-react'
import type { ShareConversationSnapshot } from '../../lib/share'

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Snapshot of the current conversation. */
  snapshot: ShareConversationSnapshot
}

type Visibility = 'public' | 'private'

type CreatedShare = {
  id: string
  url: string
  visibility: Visibility
  /** Kept client-side only so we can show the owner what code they set. */
  passcode?: string
}

export function ShareDialog({ open, onOpenChange, snapshot }: ShareDialogProps) {
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [passcode, setPasscode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<CreatedShare | null>(null)
  const [copied, setCopied] = useState(false)

  const reset = () => {
    setVisibility('public')
    setPasscode('')
    setError(null)
    setCreated(null)
    setCopied(false)
    setSubmitting(false)
  }

  const handleClose = (next: boolean) => {
    onOpenChange(next)
    if (!next) {
      // Reset after the close animation so the form doesn't flicker.
      setTimeout(reset, 200)
    }
  }

  const submit = async () => {
    if (submitting) return
    setError(null)

    if (visibility === 'private' && !/^\d{4}$/.test(passcode)) {
      setError('Passcode must be 4 digits.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/share/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshot,
          visibility,
          passcode: visibility === 'private' ? passcode : undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error === 'storage_failed' ? 'Could not save the share. Try again.' : 'Could not create share.')
        return
      }
      const data = (await res.json()) as { id: string; url: string; visibility: Visibility }
      setCreated({ ...data, passcode: visibility === 'private' ? passcode : undefined })
    } catch {
      setError('Network error. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const copy = async () => {
    if (!created) return
    try {
      await navigator.clipboard.writeText(created.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked — best-effort silent failure.
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share this conversation</DialogTitle>
          <DialogDescription>
            Anyone with the link can view a frozen snapshot of this chat.
          </DialogDescription>
        </DialogHeader>

        {!created ? (
          <div className="space-y-5">
            {/* Visibility */}
            <div className="space-y-2">
              <Label>Who can view</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility('public')}
                  className={cn(
                    'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors',
                    visibility === 'public'
                      ? 'border-foreground/40 bg-foreground/5'
                      : 'border-foreground/10 hover:border-foreground/20',
                  )}
                >
                  <Globe className="w-4 h-4 text-foreground/60" />
                  <span className="text-sm font-medium">Public</span>
                  <span className="text-xs text-foreground/50">Anyone with the link</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility('private')}
                  className={cn(
                    'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors',
                    visibility === 'private'
                      ? 'border-foreground/40 bg-foreground/5'
                      : 'border-foreground/10 hover:border-foreground/20',
                  )}
                >
                  <Lock className="w-4 h-4 text-foreground/60" />
                  <span className="text-sm font-medium">Private</span>
                  <span className="text-xs text-foreground/50">Passcode-protected</span>
                </button>
              </div>
            </div>

            {/* Passcode */}
            {visibility === 'private' && (
              <div className="space-y-2">
                <Label htmlFor="share-passcode">4-digit passcode</Label>
                <Input
                  id="share-passcode"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="••••"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  className="text-center text-xl tracking-[0.5em] font-mono"
                  autoFocus
                />
                <p className="text-xs text-foreground/50">
                  Send this code to anyone you want to give access.
                </p>
              </div>
            )}

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => handleClose(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                onClick={submit}
                disabled={submitting || (visibility === 'private' && passcode.length !== 4)}
              >
                {submitting ? 'Creating…' : 'Create link'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Share link</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={created.url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copy}
                  aria-label={copied ? 'Copied' : 'Copy link'}
                  className="shrink-0"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {created.visibility === 'private' && created.passcode && (
              <div className="rounded-lg border border-foreground/10 bg-foreground/5 p-3">
                <p className="text-xs text-foreground/60 mb-1">Passcode</p>
                <p className="text-2xl font-mono tracking-[0.4em] text-foreground">
                  {created.passcode}
                </p>
                <p className="text-xs text-foreground/50 mt-2">
                  Send this code to anyone who should be able to view the chat.
                </p>
              </div>
            )}

            <p className="text-xs text-foreground/50">
              The chat is frozen at this moment. Future replies in your local copy won&rsquo;t appear here.
            </p>

            <div className="flex justify-end">
              <Button onClick={() => handleClose(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
