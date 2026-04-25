'use client'

import { useEffect, useRef, useState } from 'react'
import { Button, Input, cn } from '@opencosmos/ui'
import { Sparkles } from 'lucide-react'
import { useCosmoSession } from './useCosmoSession'
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
    return {
      doc_path: ctx.doc_path,
      doc_title: ctx.doc_title,
      heading: ctx.heading,
      passage: ctx.passage,
    }
  } catch {
    return null
  }
}

export function CosmoChatPanel() {
  const {
    messages,
    input,
    isStreaming,
    apiKey,
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

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [ctx, setCtx] = useState<ContextSnapshot>(null)
  useEffect(() => {
    setCtx(readInitialContext())
    return onCosmoEvent('selected-section', (payload) => setCtx(payload))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    if (CSS.supports('field-sizing', 'content')) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [input])

  useEffect(() => {
    if (!isStreaming) textareaRef.current?.focus()
  }, [isStreaming])

  const placeholder = messages.length === 0 ? 'What would you like to explore?' : 'Reply...'

  return (
    <div className="relative flex flex-col h-full min-h-0">
      {/* Messages — scrollable, fills available space. Bottom padding leaves
          room for the floating glass dock so the last message can scroll up
          past it. */}
      <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 pb-32 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-foreground/30 text-sm">Begin here.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'flex flex-col gap-1',
              msg.role === 'user' ? 'items-end' : 'items-start'
            )}
          >
            <span className="text-[10px] uppercase tracking-widest text-foreground/25 px-1">
              {msg.role === 'user' ? 'You' : 'Cosmo'}
            </span>
            <div
              className={cn(
                'rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap max-w-full',
                msg.role === 'user'
                  ? 'bg-surface text-foreground'
                  : 'bg-black border border-foreground/10 text-foreground'
              )}
            >
              {msg.content}
              {isStreaming &&
                i === messages.length - 1 &&
                msg.role === 'assistant' &&
                !msg.content && (
                  <span className="inline-block w-1.5 h-3.5 bg-foreground/30 animate-pulse align-middle" />
                )}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Floating glass dock — grounding pill + composer. Messages scroll
          behind, the surface tint blurs through. Mirrors the /dialog page. */}
      <div className="absolute bottom-0 left-0 right-0 backdrop-blur-3xl bg-[var(--color-surface)]/60 supports-[backdrop-filter]:bg-[var(--color-surface)]/50">
        {/* Grounding context pill — shown when the reader is on a section */}
        {ctx && (
          <div className="px-5 py-2 flex items-center gap-2 text-xs text-foreground/40">
            <Sparkles className="w-3 h-3 shrink-0" />
            <span className="truncate">
              Grounded in <span className="text-foreground/70 font-medium">{ctx.heading}</span>
            </span>
          </div>
        )}

        {/* PM unlock — inline */}
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
                onClick={() => { setShowPmInput(false); setPmSecret('') }}
                className="text-foreground/30 hover:text-foreground/60 transition-colors text-sm leading-none w-5"
              >
                ✕
              </button>
            </div>
            {pmError && <p className="text-[11px] text-foreground/40 mt-1">{pmError}</p>}
          </div>
        )}

        {/* Composer OR API-key input */}
        {isLimited ? (
          <div className="px-5 py-3 space-y-2">
            <p className="text-xs text-foreground/50 leading-relaxed">
              You&rsquo;ve used your free token quota. Enter your{' '}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground/80"
              >
                Anthropic API key
              </a>
              {' '}to continue.
            </p>
            <div className="flex gap-1.5">
              <Input
                type="password"
                placeholder="sk-ant-..."
                value={apiKeyDraft}
                onChange={(e) => setApiKeyDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveKey()}
                className="flex-1 text-xs"
              />
              <Button onClick={saveKey} disabled={!apiKeyDraft.trim()} variant="outline" size="sm">
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-5 py-3">
            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                placeholder={placeholder}
                rows={1}
                disabled={isStreaming}
                className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-foreground/30 outline-none border border-foreground/15 rounded-lg px-3 py-2 leading-relaxed focus:border-foreground/30 transition-colors disabled:opacity-50 min-h-[40px] max-h-[160px] overflow-y-auto [field-sizing:content]"
              />
              <Button
                onClick={send}
                disabled={!input.trim() || isStreaming}
                size="sm"
                className="shrink-0 h-10"
              >
                {isStreaming ? '···' : 'Send'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
