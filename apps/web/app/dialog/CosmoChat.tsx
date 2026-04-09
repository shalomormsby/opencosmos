'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Header, Button, Input, cn, AppSidebar, AppSidebarProvider, AppSidebarInset, OpenCosmosIcon, useAppSidebar, APP_SIDEBAR_WIDTH, APP_SIDEBAR_WIDTH_COLLAPSED, useMotionPreference } from '@opencosmos/ui'
import Link from 'next/link'
import { MessageSquare, BookOpen, ExternalLink } from 'lucide-react'
import { AuthButton } from '../AuthButton'
import { SidebarAvatar } from '../SidebarAvatar'
import { TokenGauge } from '@/components/TokenGauge'

type Message = { role: 'user' | 'assistant'; content: string }

type Conversation = {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

const DEFAULT_TOKEN_BUDGET = 20_000
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

function SidebarFooterContent({
  mounted,
  apiKey,
  tokensUsed,
  tokenBudget,
  pmMode,
  onPmClick,
}: {
  mounted: boolean
  apiKey: string
  tokensUsed: number
  tokenBudget: number
  pmMode: boolean
  onPmClick: () => void
}) {
  const { isOpen } = useAppSidebar()

  if (!isOpen) {
    // Collapsed: avatar only — invisible PM lock sits on top
    return (
      <div className="relative flex justify-center">
        <SidebarAvatar />
        <button
          onClick={onPmClick}
          className="absolute inset-0 opacity-0"
          aria-label={pmMode ? 'Deactivate PM mode' : 'Activate PM mode'}
          tabIndex={-1}
        />
      </div>
    )
  }

  return (
    // Single row: avatar · gauge · auth button · invisible PM lock
    <div className="flex items-center gap-2">
      <SidebarAvatar />
      {mounted && (
        <TokenGauge
          used={tokensUsed}
          total={tokenBudget}
          unlimited={!!apiKey}
          compact
          className="shrink-0"
        />
      )}
      <AuthButton className="flex-1" />
      {/* Invisible PM lock — sits at the end to preserve tap target */}
      <button
        onClick={onPmClick}
        className="opacity-0 w-4 h-4 shrink-0"
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
  )
}

function BottomBarWrapper({ children, className }: { children: React.ReactNode; className?: string }) {
  const { isOpen } = useAppSidebar()
  const { shouldAnimate, scale } = useMotionPreference()
  const duration = shouldAnimate ? Math.round(300 * (5 / Math.max(scale, 0.1))) : 0
  return (
    <div
      className={cn('fixed bottom-0 right-0 z-30', className)}
      style={{
        left: isOpen ? APP_SIDEBAR_WIDTH : APP_SIDEBAR_WIDTH_COLLAPSED,
        transition: shouldAnimate ? `left ${duration}ms ease-out` : 'none',
      }}
    >
      {children}
    </div>
  )
}

// Closes the sidebar on first visit to narrow viewports so the content area
// stays usable. If the user has previously set an explicit preference (open
// or closed), that preference is respected and this does nothing.
function MobileSidebarInit({ storageKey }: { storageKey: string }) {
  const { close } = useAppSidebar()
  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    if (stored === null && window.innerWidth < 640) close()
  }, [close, storageKey])
  return null
}

export function CosmoChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [apiKeyDraft, setApiKeyDraft] = useState('')
  const [tokensUsed, setTokensUsed] = useState(0)
  const [tokenBudget, setTokenBudget] = useState(DEFAULT_TOKEN_BUDGET)
  const [sessionExpiresAt, setSessionExpiresAt] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [currentId, setCurrentId] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [pmMode, setPmMode] = useState(false)
  const [showPmInput, setShowPmInput] = useState(false)
  const [pmSecret, setPmSecret] = useState('')
  const [pmError, setPmError] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
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

    // Fetch server-authoritative token quota
    fetch('/api/session')
      .then((r) => r.json())
      .then((data: { tokensUsed: number; tokenBudget: number; sessionExpiresAt: number }) => {
        setTokensUsed(data.tokensUsed)
        setTokenBudget(data.tokenBudget)
        setSessionExpiresAt(data.sessionExpiresAt)
      })
      .catch(() => {}) // fail silently — UI defaults to DEFAULT_TOKEN_BUDGET

    // Check if Shalom mode is active (HttpOnly cookie read server-side)
    fetch('/api/admin/auth')
      .then((r) => r.json())
      .then((data: { active: boolean }) => setPmMode(data.active))
      .catch(() => {})

    // If signed in, merge server conversations with local ones so history is visible
    // across devices. Local `id` is used (not currentId state) since state hasn't flushed yet.
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then(async (data: { user: object | null }) => {
        if (!data.user) return
        setIsAuthenticated(true)

        const res = await fetch('/api/conversations')
        if (!res.ok) return
        const { conversations: serverConvs } = (await res.json()) as { conversations: Conversation[] }

        const local = loadAll()

        // Migrate any local-only conversations up to the server (e.g. pre-login usage)
        const localOnly = Object.values(local).filter((c) => !serverConvs.find((s) => s.id === c.id))
        for (const conv of localOnly) {
          fetch('/api/conversations', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversation: conv }),
          }).catch(() => {})
        }

        if (serverConvs.length === 0) return

        // Merge server into local (server wins on conflict), update localStorage + sidebar
        const merged = { ...local }
        for (const conv of serverConvs) {
          merged[conv.id] = conv
        }
        localStorage.setItem(KEY_CONVERSATIONS, JSON.stringify(merged))
        setConversations(Object.values(merged).sort((a, b) => b.updatedAt - a.updatedAt))

        // If the currently open conversation came from server (not in local), load its messages
        const fromServer = serverConvs.find((c) => c.id === id)
        if (fromServer && !local[fromServer.id]) {
          setMessages(fromServer.messages)
        }
      })
      .catch(() => {})

    setMounted(true)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    // Skip JS resize on browsers that support field-sizing:content (CSS handles it natively)
    if (CSS.supports('field-sizing', 'content')) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [input])

  const refreshConversations = useCallback(() => {
    setConversations(Object.values(loadAll()).sort((a, b) => b.updatedAt - a.updatedAt))
  }, [])

  const isLimited = mounted && !apiKey && !pmMode && tokensUsed >= tokenBudget

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
        setTokensUsed(tokenBudget) // pin gauge to empty
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

      // Refresh server-authoritative token quota after each free exchange
      if (!apiKey) {
        fetch('/api/session')
          .then((r) => r.json())
          .then((data: { tokensUsed: number; tokenBudget: number; sessionExpiresAt: number }) => {
            setTokensUsed(data.tokensUsed)
            setTokenBudget(data.tokenBudget)
            setSessionExpiresAt(data.sessionExpiresAt)
          })
          .catch(() => {})
      }

      const finalMessages: Message[] = [
        ...newMessages,
        { role: 'assistant', content: assistantContent },
      ]
      const all = loadAll()
      const existing = all[currentId]
      const savedConv: Conversation = {
        id: currentId,
        title: toTitle(finalMessages),
        messages: finalMessages,
        createdAt: existing?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      }
      persist(savedConv)
      if (isAuthenticated) {
        fetch('/api/conversations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversation: savedConv }),
        }).catch(() => {})
      }
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
  }, [input, isStreaming, isLimited, messages, apiKey, currentId, refreshConversations, isAuthenticated])

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
    <div className="flex flex-col h-full overflow-hidden">
      {/* + New dialog */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={startNew}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New dialog
        </Button>
      </div>

      {/* Your dialogs label */}
      <div className="px-4 pb-1 shrink-0">
        <p className="text-xs uppercase tracking-widest text-foreground/25">Your dialogs</p>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {conversations.length === 0 ? (
          <p className="text-xs text-foreground/30 text-center py-8 px-4">
            No previous dialogs.
          </p>
        ) : (
          <div className="py-1">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => openConversation(conv)}
                className={cn(
                  'w-full text-left px-4 py-2.5 hover:bg-foreground/5 transition-colors',
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
    <AppSidebarProvider defaultOpen={true} storageKey="appsidebar:dialog">
      <MobileSidebarInit storageKey="appsidebar:dialog" />
      <AppSidebar
        logo={<OpenCosmosIcon size={20} />}
        bottomItems={[
          { icon: <MessageSquare className="w-4 h-4" />, label: 'Dialog',    href: '/dialog',                                           active: true },
          { icon: <BookOpen     className="w-4 h-4" />, label: 'Knowledge', href: '/knowledge' },
          { icon: <ExternalLink className="w-4 h-4" />, label: 'Studio',    href: 'https://studio.opencosmos.ai/docs/getting-started', external: true },
        ]}
        footer={
          <SidebarFooterContent
            mounted={mounted}
            apiKey={apiKey}
            tokensUsed={tokensUsed}
            tokenBudget={tokenBudget}
            pmMode={pmMode}
            onPmClick={() => pmMode ? deactivatePm() : setShowPmInput(!showPmInput)}
          />
        }
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
            { label: 'Studio',    href: 'https://studio.opencosmos.ai/docs/getting-started' },
          ]}
          actions={<AuthButton />}
        />

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
          <BottomBarWrapper className={cn('px-6 py-5', glass)}>
            <div className="max-w-2xl mx-auto space-y-3">
              <p className="text-sm text-foreground/50 leading-relaxed">
                You&rsquo;ve used your free token quota. To continue, enter your{' '}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-foreground/80"
                >
                  Anthropic API key
                </a>
                {' '}or{' '}
                <Link href="/account" className="underline underline-offset-2 hover:text-foreground/80">
                  subscribe
                </Link>
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
          </BottomBarWrapper>
        ) : (
          <BottomBarWrapper className={cn('px-6 py-4', glass)}>
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
                className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-foreground/30 outline-none border border-foreground/15 rounded-xl px-4 py-3 leading-relaxed focus:border-foreground/30 transition-colors disabled:opacity-50 min-h-[48px] max-h-[160px] overflow-y-auto [field-sizing:content]"
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
          </BottomBarWrapper>
        )}
      </AppSidebarInset>
    </AppSidebarProvider>
  )
}
