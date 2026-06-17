'use client'

import { useEffect, useRef } from 'react'
import { Button, Input, cn } from '@opencosmos/ui'

// Shared presentational chat panel — the single Cosmo dialog surface used by
// /dialog, /knowledge, and /inception. It renders a message list + a floating
// glass dock (composer, or the BYOK input when the free quota is spent). All
// behaviour is injected via `session`, so it's agnostic to which brain drives it
// (useCosmoSession or useInceptionCosmo). Context-specific UI (the knowledge
// grounding pill, the PM unlock) is passed through `dockSlot`.

export type ChatPanelSession = {
  messages: { role: 'user' | 'assistant'; content: string }[]
  input: string
  setInput: (v: string) => void
  isStreaming: boolean
  isLimited: boolean
  apiKeyDraft: string
  setApiKeyDraft: (v: string) => void
  saveKey: () => void
  send: () => void
}

export function ChatPanel({
  session,
  emptyState,
  placeholderEmpty = 'What would you like to explore?',
  placeholderReply = 'Reply...',
  dockSlot,
}: {
  session: ChatPanelSession
  emptyState?: React.ReactNode
  placeholderEmpty?: string
  placeholderReply?: string
  dockSlot?: React.ReactNode
}) {
  const { messages, input, setInput, isStreaming, isLimited, apiKeyDraft, setApiKeyDraft, saveKey, send } = session
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  const placeholder = messages.length === 0 ? placeholderEmpty : placeholderReply

  return (
    <div className="relative flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 pb-32 space-y-4">
        {messages.length === 0 && (emptyState ?? <div className="text-center py-12"><p className="text-foreground/30 text-sm">Begin here.</p></div>)}

        {messages.map((msg, i) => (
          <div key={i} className={cn('flex flex-col gap-1', msg.role === 'user' ? 'items-end' : 'items-start')}>
            <span className="text-[10px] uppercase tracking-widest text-foreground/25 px-1">{msg.role === 'user' ? 'You' : 'Cosmo'}</span>
            <div
              className={cn(
                'rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap max-w-full',
                msg.role === 'user' ? 'bg-surface text-foreground' : 'bg-black border border-foreground/10 text-foreground',
              )}
            >
              {msg.content}
              {isStreaming && i === messages.length - 1 && msg.role === 'assistant' && !msg.content && (
                <span className="inline-block w-1.5 h-3.5 bg-foreground/30 animate-pulse align-middle" />
              )}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      <div className="absolute bottom-0 left-0 right-0 backdrop-blur-3xl bg-[var(--color-surface)]/60 supports-[backdrop-filter]:bg-[var(--color-surface)]/50">
        {dockSlot}

        {isLimited ? (
          <div className="px-5 py-3 space-y-2">
            <p className="text-xs text-foreground/50 leading-relaxed">
              You&rsquo;ve used your free token quota. Enter your{' '}
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground/80">
                Anthropic API key
              </a>{' '}
              to continue.
            </p>
            <div className="flex gap-1.5">
              <Input type="password" placeholder="sk-ant-..." value={apiKeyDraft} onChange={(e) => setApiKeyDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveKey()} className="flex-1 text-xs" />
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
              <Button onClick={() => send()} disabled={!input.trim() || isStreaming} size="sm" className="shrink-0 h-10">
                {isStreaming ? '···' : 'Send'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
