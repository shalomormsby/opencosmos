'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button, Input, ScrollArea, cn } from '@opencosmos/ui'

type Message = { role: 'user' | 'assistant'; content: string }

type Conversation = {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

const FREE_LIMIT = 3
const KEY_API_KEY = 'cosmo_api_key'
const KEY_CONVERSATIONS = 'cosmo_conversations'
const KEY_CURRENT_ID = 'cosmo_current_id'

function loadAll(): Record<string, Conversation> {
  try {
    return JSON.parse(localStorage.getItem(KEY_CONVERSATIONS) || '{}')
  } catch {
    return {}
  }
}

function persist(conv: Conversation) {
  const all = loadAll()
  all[conv.id] = conv
  localStorage.setItem(KEY_CONVERSATIONS, JSON.stringify(all))
}

function toTitle(messages: Message[]): string {
  const first = messages.find((m) => m.role === 'user')
  if (!first) return 'New conversation'
  return first.content.length > 50 ? first.content.slice(0, 50) + '…' : first.content
}

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function CosmoChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [apiKeyDraft, setApiKeyDraft] = useState('')
  const [remaining, setRemaining] = useState(FREE_LIMIT)
  const [mounted, setMounted] = useState(false)
  const [currentId, setCurrentId] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setApiKey(localStorage.getItem(KEY_API_KEY) || '')

    const savedId = localStorage.getItem(KEY_CURRENT_ID)
    const all = loadAll()

    let id: string
    if (savedId && all[savedId]) {
      id = savedId
      setMessages(all[savedId].messages)
    } else {
      id = crypto.randomUUID()
      localStorage.setItem(KEY_CURRENT_ID, id)
    }

    setCurrentId(id)
    setConversations(Object.values(all).sort((a, b) => b.updatedAt - a.updatedAt))

    // Fetch server-authoritative remaining count
    fetch('/api/session')
      .then((r) => r.json())
      .then((data: { remaining: number }) => setRemaining(data.remaining))
      .catch(() => {}) // fail silently — UI defaults to FREE_LIMIT

    setMounted(true)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [input])

  const refreshConversations = useCallback(() => {
    setConversations(Object.values(loadAll()).sort((a, b) => b.updatedAt - a.updatedAt))
  }, [])

  const isLimited = mounted && !apiKey && remaining <= 0

  const send = useCallback(async () => {
    if (!input.trim() || isStreaming || isLimited) return

    const content = input.trim()
    setInput('')

    const newMessages: Message[] = [...messages, { role: 'user', content }]
    setMessages([...newMessages, { role: 'assistant', content: '' }])
    setIsStreaming(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, apiKey: apiKey || undefined }),
      })

      if (res.status === 429) {
        setRemaining(0)
        setMessages((prev) => prev.slice(0, -1)) // remove the empty assistant placeholder
        setIsStreaming(false)
        textareaRef.current?.focus()
        return
      }

      if (!res.ok || !res.body) throw new Error('API error')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        assistantContent += chunk
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: updated[updated.length - 1].content + chunk,
          }
          return updated
        })
      }

      // Refresh server-authoritative remaining count after each free exchange
      if (!apiKey) {
        fetch('/api/session')
          .then((r) => r.json())
          .then((data: { remaining: number }) => setRemaining(data.remaining))
          .catch(() => {})
      }

      const finalMessages: Message[] = [
        ...newMessages,
        { role: 'assistant', content: assistantContent },
      ]
      const all = loadAll()
      const existing = all[currentId]
      persist({
        id: currentId,
        title: toTitle(finalMessages),
        messages: finalMessages,
        createdAt: existing?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      })
      refreshConversations()
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
  }, [input, isStreaming, isLimited, messages, apiKey, currentId, refreshConversations])

  const saveKey = () => {
    const key = apiKeyDraft.trim()
    if (!key) return
    localStorage.setItem(KEY_API_KEY, key)
    setApiKey(key)
    setApiKeyDraft('')
  }

  const startNew = () => {
    const id = crypto.randomUUID()
    localStorage.setItem(KEY_CURRENT_ID, id)
    setCurrentId(id)
    setMessages([])
    setShowHistory(false)
  }

  const openConversation = (conv: Conversation) => {
    localStorage.setItem(KEY_CURRENT_ID, conv.id)
    setCurrentId(conv.id)
    setMessages(conv.messages)
    setShowHistory(false)
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* History backdrop */}
      {showHistory && (
        <div
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
          onClick={() => setShowHistory(false)}
        />
      )}

      {/* History panel */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-background border-r border-foreground/10 flex flex-col',
          'transition-transform duration-200 ease-in-out',
          showHistory ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-foreground/10 shrink-0">
          <span className="text-sm text-foreground/60">Conversations</span>
          <button
            onClick={() => setShowHistory(false)}
            className="text-foreground/30 hover:text-foreground/60 transition-colors text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="px-3 py-3 border-b border-foreground/10 shrink-0">
          <Button variant="outline" size="sm" className="w-full" onClick={startNew}>
            New conversation
          </Button>
        </div>
        <ScrollArea className="flex-1">
          {conversations.length === 0 ? (
            <p className="text-xs text-foreground/30 text-center py-10 px-4">
              No previous conversations.
            </p>
          ) : (
            <div className="py-2">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => openConversation(conv)}
                  className={cn(
                    'w-full text-left px-4 py-3 hover:bg-foreground/5 transition-colors',
                    conv.id === currentId && 'bg-foreground/5'
                  )}
                >
                  <p className="text-sm text-foreground/75 truncate">{conv.title}</p>
                  <p className="text-xs text-foreground/30 mt-0.5">{timeAgo(conv.updatedAt)}</p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </aside>

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-foreground/10 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-foreground/35 hover:text-foreground/65 transition-colors"
            aria-label="Conversation history"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <a
            href="/"
            className="text-sm text-foreground/40 hover:text-foreground/70 transition-colors"
          >
            ← OpenCosmos
          </a>
        </div>
        {mounted && (
          <span className="text-xs text-foreground/30">
            {apiKey
              ? 'Your key · Unlimited'
              : `${remaining} free ${remaining === 1 ? 'message' : 'messages'} remaining`}
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
      </ScrollArea>

      {/* BYOK entry */}
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
              Your key is stored only in your browser and never sent to OpenCosmos servers beyond
              forwarding to Anthropic.
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
