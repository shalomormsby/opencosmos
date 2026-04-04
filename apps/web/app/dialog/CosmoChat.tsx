'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Header, Button, Input, cn, AppSidebar, AppSidebarProvider, AppSidebarInset, OpenCosmosIcon } from '@opencosmos/ui'
import Link from 'next/link'
import { MessageSquare, BookOpen, ExternalLink } from 'lucide-react'
import { AuthButton } from '../AuthButton'

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

// Shared liquid glass style — matches the header's always-on glass
const glass = 'backdrop-blur-3xl bg-[var(--color-surface)]/60 supports-[backdrop-filter]:bg-[var(--color-surface)]/50'

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
  const [pmMode, setPmMode] = useState(false)
  const [showPmInput, setShowPmInput] = useState(false)
  const [pmSecret, setPmSecret] = useState('')
  const [pmError, setPmError] = useState('')
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

    // Check if Shalom mode is active (HttpOnly cookie read server-side)
    fetch('/api/admin/auth')
      .then((r) => r.json())
      .then((data: { active: boolean }) => setPmMode(data.active))
      .catch(() => {})

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

  const isLimited = mounted && !apiKey && !pmMode && remaining <= 0

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

  const activatePm = async () => {
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: pmSecret }),
    })
    if (res.ok) {
      setPmMode(true)
      setShowPmInput(false)
      setPmSecret('')
      setPmError('')
    } else {
      setPmError('Incorrect.')
    }
  }

  const deactivatePm = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    setPmMode(false)
    setShowPmInput(false)
  }

  const startNew = () => {
    const id = crypto.randomUUID()
    localStorage.setItem(KEY_CURRENT_ID, id)
    setCurrentId(id)
    setMessages([])
  }

  const openConversation = (conv: Conversation) => {
    localStorage.setItem(KEY_CURRENT_ID, conv.id)
    setCurrentId(conv.id)
    setMessages(conv.messages)
  }

  // Conversation history content — rendered inside AppSidebar's children slot
  const historyContent = (
    <div className="flex flex-col h-full">
      <div className="px-3 py-3 border-b border-foreground/10 shrink-0">
        <Button variant="outline" size="sm" className="w-full" onClick={startNew}>
          New conversation
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
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
      </div>
    </div>
  )

  return (
    <AppSidebarProvider defaultOpen={false}>
      <AppSidebar
        logo={<OpenCosmosIcon size={20} />}
        title="OpenCosmos"
        items={[
          { icon: <MessageSquare className="w-4 h-4" />, label: 'Dialog',    href: '/dialog',                      active: true },
          { icon: <BookOpen     className="w-4 h-4" />, label: 'Knowledge', href: '/knowledge' },
          { icon: <ExternalLink className="w-4 h-4" />, label: 'Studio',    href: 'https://studio.opencosmos.ai', external: true },
        ]}
        footer={<AuthButton />}
      >
        {historyContent}
      </AppSidebar>

      <AppSidebarInset>
        {/* Main header — fixed with always-on liquid glass */}
        <Header
          sticky={false}
          glassOnScroll={false}
          className="sticky top-0 z-40 backdrop-blur-3xl bg-[var(--color-surface)]/60 supports-[backdrop-filter]:bg-[var(--color-surface)]/50"
          logo={
            <Link href="/" className="text-xl font-bold tracking-tight text-foreground">
              OpenCosmos
            </Link>
          }
          navAlignment="right"
          navLinks={[
            { label: 'Dialog',    href: '/dialog' },
            { label: 'Knowledge', href: '/knowledge' },
            { label: 'Studio',    href: 'https://studio.opencosmos.ai' },
          ]}
          actions={<AuthButton />}
        />

        {/* Status bar */}
        <div className={cn('sticky top-16 lg:top-20 z-30 flex items-center justify-end px-6 py-2', glass)}>
          <div className="flex items-center gap-3">
            {mounted && (
              <span className="text-xs text-foreground/30">
                {apiKey
                  ? 'Your key · Unlimited'
                  : `${remaining} free ${remaining === 1 ? 'message' : 'messages'} remaining`}
              </span>
            )}
            <button
              onClick={() => pmMode ? deactivatePm() : setShowPmInput(!showPmInput)}
              className={cn(
                'transition-colors',
                pmMode ? 'text-foreground/60' : 'text-foreground/20 hover:text-foreground/45'
              )}
              aria-label={pmMode ? 'Deactivate PM mode' : 'Activate PM mode'}
              title={pmMode ? 'PM mode active — click to deactivate' : 'PM mode'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {pmMode ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 018 0M5 11h14a1 1 0 011 1v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7a1 1 0 011-1z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zM10 9V7a2 2 0 114 0v2H10z" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* PM unlock input */}
        {showPmInput && !pmMode && (
          <div className="border-b border-foreground/10 px-6 py-3">
            <div className="max-w-2xl mx-auto flex gap-2 items-center">
              <input
                type="password"
                placeholder="Enter PM secret"
                value={pmSecret}
                onChange={(e) => { setPmSecret(e.target.value); setPmError('') }}
                onKeyDown={(e) => e.key === 'Enter' && activatePm()}
                autoFocus
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground/30 outline-none border border-foreground/15 rounded-lg px-3 py-2 focus:border-foreground/30 transition-colors"
              />
              <Button variant="outline" size="sm" onClick={activatePm} disabled={!pmSecret.trim()}>
                Unlock
              </Button>
              <button
                onClick={() => { setShowPmInput(false); setPmSecret(''); setPmError('') }}
                className="text-foreground/30 hover:text-foreground/60 transition-colors text-lg leading-none"
              >
                ✕
              </button>
            </div>
            {pmError && <p className="text-xs text-foreground/40 mt-1.5 max-w-2xl mx-auto">{pmError}</p>}
          </div>
        )}

        {/* Messages — scroll under the glass header and footer */}
        <div className="pb-40">
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
        </div>

        {/* Fixed bottom bar — liquid glass */}
        {isLimited ? (
          <div className={cn('fixed bottom-0 left-0 right-0 z-30 px-6 py-5', glass)}>
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
                <Button onClick={saveKey} disabled={!apiKeyDraft.trim()} variant="outline" size="sm">
                  Continue
                </Button>
              </div>
              <p className="text-xs text-foreground/25">
                Your key is stored only in your browser and never sent to OpenCosmos servers beyond
                forwarding to Anthropic.
              </p>
            </div>
          </div>
        ) : (
          <div className={cn('fixed bottom-0 left-0 right-0 z-30 px-6 py-4', glass)}>
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
      </AppSidebarInset>
    </AppSidebarProvider>
  )
}
