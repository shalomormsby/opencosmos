'use client'

import { useState } from 'react'
import { Button, Input, Card, cn } from '@opencosmos/ui'
import Link from 'next/link'

interface PasscodeGateProps {
  shareId: string
  onUnlock: (data: { snapshot: import('../../../lib/share').ShareConversationSnapshot; visibility: 'public' | 'private' }) => void
}

/**
 * Passcode entry for private shares. On correct code, the parent component
 * is given the unlocked snapshot and switches to SharedChatView.
 */
export function PasscodeGate({ shareId, onUnlock }: PasscodeGateProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!/^\d{4}$/.test(code) || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/share/${encodeURIComponent(shareId)}?code=${encodeURIComponent(code)}`, {
        cache: 'no-store',
      })
      if (res.status === 401) {
        setError('That code didn’t match. Try again.')
        setCode('')
        return
      }
      if (res.status === 404) {
        setError('This share no longer exists.')
        return
      }
      if (!res.ok) {
        setError('Something went wrong. Try again.')
        return
      }
      const data = await res.json()
      if (data.locked) {
        setError('That code didn’t match. Try again.')
        setCode('')
        return
      }
      onUnlock({ snapshot: data.share.snapshot, visibility: data.share.visibility })
    } catch {
      setError('Network error. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <Card className="w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <Link
            href="/"
            className="text-xs text-foreground/40 hover:text-foreground/70 transition-colors uppercase tracking-wider"
          >
            OpenCosmos
          </Link>
          <h1 className="text-xl font-light text-foreground mt-3 mb-1">Private share</h1>
          <p className="text-xs text-foreground/50">Enter the 4-digit code to view this conversation.</p>
        </div>
        <div className="flex flex-col gap-3">
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            placeholder="••••"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            autoFocus
            className={cn(
              'text-center text-2xl tracking-[0.5em] font-mono',
              'bg-transparent border-foreground/15 focus:border-foreground/30',
            )}
          />
          <Button onClick={submit} disabled={code.length !== 4 || submitting} size="default">
            {submitting ? 'Checking…' : 'Unlock'}
          </Button>
          {error && <p className="text-xs text-destructive text-center mt-1">{error}</p>}
        </div>
      </Card>
    </main>
  )
}
