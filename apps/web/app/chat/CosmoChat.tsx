'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button, Input, ScrollArea, cn } from '@thesage/ui'

type Message = { role: 'user' | 'assistant'; content: string }

const FREE_LIMIT = 3
const KEY_FREE_COUNT = 'cosmo_free_count'
const KEY_API_KEY = 'cosmo_api_key'

export function CosmoChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [apiKeyDraft, setApiKeyDraft] = useState('')
  const [freeCount, setFreeCount] = useState(0)
  const [mounted, setMounted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setApiKey(localStorage.getItem(KEY_API_KEY) || '')
    setFreeCount(Number(localStorage.getItem(KEY_FREE_COUNT) || '0'))
    setMounted(true)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [input])

  const isLimited = mounted && !apiKey && freeCount >= FREE_LIMIT

  const send = useCallback(async () => {
    if (!input.trim() || isStreaming || isLimited) return

    const content = input.trim()
    setInput('')

    const newMessages: Message[] = [...messages, { role: 'user', content }]
    setMessages([...newMessages, { role: 'assistant', content: '' }])
    setIsStreaming(true)

    if (!apiKey) {
      const next = freeCount + 1
      setFreeCount(next)
      localStorage.setItem(KEY_FREE_COUNT, String(next))
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          apiKey: apiKey || undefined,
        }),
      })

      if (!res.ok || !res.body) throw new Error('API error')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: updated[updated.length - 1].content + chunk,
          }
          return updated
        })
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: 'Something interrupted our conversation. Please try again.',
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
      textareaRef.current?.focus()
    }
  }, [input, isStreaming, isLimited, messages, apiKey, freeCount])

  const saveKey = () => {
    const key = apiKeyDraft.trim()
    if (!key) return
    localStorage.setItem(KEY_API_KEY, key)
    setApiKey(key)
    setApiKeyDraft('')
  }

  const remainingFree = Math.max(0, FREE_LIMIT - freeCount)

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-foreground/10 shrink-0">
        <a
          href="/"
          className="text-sm text-foreground/40 hover:text-foreground/70 transition-colors"
        >
          ← OpenCosmos
        </a>
        {mounted && (
          <span className="text-xs text-foreground/30">
            {apiKey ? 'Your key · Unlimited' : `${remainingFree} free ${remainingFree === 1 ? 'message' : 'messages'} remaining`}
          </span>
        )}
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
          {messages.length === 0 && (
            <div className="text-center py-20">
              <p className="text-foreground/30 text-sm">Begin here.</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex flex-col gap-1.5',
                msg.role === 'user' ? 'items-end' : 'items-start'
              )}
            >
              <span className="text-xs text-foreground/25 px-1">
                {msg.role === 'user' ? 'You' : 'Cosmo'}
              </span>
              <div
                className={cn(
                  'rounded-2xl px-5 py-4 text-sm leading-relaxed whitespace-pre-wrap max-w-prose',
                  msg.role === 'user'
                    ? 'bg-foreground/8 text-foreground'
                    : 'border border-foreground/10 text-foreground'
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
      </ScrollArea>

      {/* BYOK entry — shown when free limit is reached */}
      {isLimited && (
        <div className="border-t border-foreground/10 px-6 py-5 shrink-0">
          <div className="max-w-2xl mx-auto space-y-3">
            <p className="text-sm text-foreground/50 leading-relaxed">
              Your 3 free messages are complete. To continue, enter your{' '}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground/80"
              >
                Anthropic API key
              </a>
              .
            </p>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="sk-ant-..."
                value={apiKeyDraft}
                onChange={(e) => setApiKeyDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveKey()}
                className="flex-1 text-sm"
              />
              <Button
                onClick={saveKey}
                disabled={!apiKeyDraft.trim()}
                variant="outline"
                size="sm"
              >
                Continue
              </Button>
            </div>
            <p className="text-xs text-foreground/25">
              Your key is stored only in your browser and never sent to OpenCosmos servers beyond forwarding to Anthropic.
            </p>
          </div>
        </div>
      )}

      {/* Input */}
      {!isLimited && (
        <div className="border-t border-foreground/10 px-6 py-4 shrink-0">
          <div className="max-w-2xl mx-auto flex gap-3 items-end">
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
              placeholder="What's present for you?"
              rows={1}
              disabled={isStreaming}
              className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-foreground/30 outline-none border border-foreground/15 rounded-xl px-4 py-3 leading-relaxed focus:border-foreground/30 transition-colors disabled:opacity-50 min-h-[48px] max-h-[160px] overflow-y-auto"
            />
            <Button
              onClick={send}
              disabled={!input.trim() || isStreaming}
              size="sm"
              className="shrink-0 h-12"
            >
              {isStreaming ? '···' : 'Send'}
            </Button>
          </div>
          <p className="text-xs text-foreground/20 text-center mt-2">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      )}
    </div>
  )
}
