'use client'

import { useEffect, useState } from 'react'
import { Button } from '@opencosmos/ui'
import { Sparkles } from 'lucide-react'
import { useCosmoSession } from './useCosmoSession'
import { ChatPanel } from './ChatPanel'
import { onCosmoEvent, type CosmoEventPayload } from '@/lib/cosmo-events'

type ContextSnapshot = CosmoEventPayload<'selected-section'> | null

function readInitialContext(): ContextSnapshot {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem('cosmo_context')
    if (!raw) return null
    const ctx = JSON.parse(raw) as {
      heading: string
      passage: string
      doc_title: string
      doc_path: string
      timestamp: number
    }
    if (Date.now() - ctx.timestamp > 30 * 60 * 1000) return null
    return { doc_path: ctx.doc_path, doc_title: ctx.doc_title, heading: ctx.heading, passage: ctx.passage }
  } catch {
    return null
  }
}

/**
 * The /dialog + /knowledge Cosmo chat. Thin wrapper around the shared <ChatPanel>:
 * binds it to the global dialog session (useCosmoSession) and supplies the
 * dialog-specific dock extras — the knowledge grounding pill and the PM unlock.
 */
export function CosmoChatPanel() {
  const {
    messages,
    input,
    isStreaming,
    apiKeyDraft,
    pmMode,
    showPmInput,
    pmSecret,
    pmError,
    isLimited,
    setInput,
    setApiKeyDraft,
    setShowPmInput,
    setPmSecret,
    send,
    saveKey,
    activatePm,
  } = useCosmoSession()

  const [ctx, setCtx] = useState<ContextSnapshot>(null)
  useEffect(() => {
    setCtx(readInitialContext())
    return onCosmoEvent('selected-section', (payload) => setCtx(payload))
  }, [])

  const dockSlot = (
    <>
      {ctx && (
        <div className="px-5 py-2 flex items-center gap-2 text-xs text-foreground/40">
          <Sparkles className="w-3 h-3 shrink-0" />
          <span className="truncate">
            Grounded in <span className="text-foreground/70 font-medium">{ctx.heading}</span>
          </span>
        </div>
      )}

      {showPmInput && !pmMode && (
        <div className="px-5 py-2.5">
          <div className="flex gap-1.5 items-center">
            <input
              type="password"
              placeholder="PM secret"
              value={pmSecret}
              onChange={(e) => setPmSecret(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && activatePm()}
              autoFocus
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-foreground/30 outline-none border border-foreground/15 rounded-md px-2 py-1.5 focus:border-foreground/30 transition-colors"
            />
            <Button variant="outline" size="sm" onClick={activatePm} disabled={!pmSecret.trim()}>
              Unlock
            </Button>
            <button
              onClick={() => {
                setShowPmInput(false)
                setPmSecret('')
              }}
              className="text-foreground/30 hover:text-foreground/60 transition-colors text-sm leading-none w-5"
            >
              ✕
            </button>
          </div>
          {pmError && <p className="text-[11px] text-foreground/40 mt-1">{pmError}</p>}
        </div>
      )}
    </>
  )

  return (
    <ChatPanel
      session={{ messages, input, setInput, isStreaming, isLimited, apiKeyDraft, setApiKeyDraft, saveKey, send }}
      dockSlot={dockSlot}
    />
  )
}
