'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'

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
// sessionStorage, not localStorage: staying in Xensō across a reload and a
// "New dialog" is the point, but it should not silently still be on in a new
// tab next week. `?xenso=0` turns it off explicitly.
const KEY_XENSO = 'cosmo_xenso'

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

function remove(id: string) {
  const all = loadAll()
  delete all[id]
  localStorage.setItem(KEY_CONVERSATIONS, JSON.stringify(all))
}

function toTitle(messages: Message[]): string {
  const first = messages.find((m) => m.role === 'user')
  if (!first) return 'New conversation'
  return first.content.length > 50 ? first.content.slice(0, 50) + '…' : first.content
}

type CosmoSession = {
  // State
  mounted: boolean
  messages: Message[]
  input: string
  isStreaming: boolean
  apiKey: string
  apiKeyDraft: string
  tokensUsed: number
  tokenBudget: number
  sessionExpiresAt: number
  currentId: string
  conversations: Conversation[]
  pmMode: boolean
  showPmInput: boolean
  pmSecret: string
  pmError: string
  creativeMode: boolean
  xensoMode: boolean
  isAuthenticated: boolean
  isLimited: boolean

  // Setters
  setInput: (v: string) => void
  setApiKeyDraft: (v: string) => void
  /** Turn Xensō mode on or off and persist the choice for this browser session. */
  applyXensoMode: (on: boolean) => void
  setShowPmInput: (v: boolean) => void
  setPmSecret: (v: string) => void

  // Actions
  send: (override?: string) => Promise<void>
  startNew: () => void
  openConversation: (conv: Conversation) => void
  renameConversation: (id: string, title: string) => void
  deleteConversation: (id: string) => void
  saveKey: () => void
  activatePm: () => Promise<void>
  deactivatePm: () => Promise<void>

  // Internal
  hydrate: () => void
}

const CosmoSessionCtx = createContext<CosmoSession | null>(null)

export function CosmoSessionProvider({ children }: { children: ReactNode }) {
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
  const [creativeMode, setCreativeMode] = useState(false)
  // Temporary scaffolding: ?xenso=1 loads the Xensō quest-guide module onto this
  // surface so the game is playable — with real persistence, since Dialog
  // conversations already save — before /xenso exists. Retire once it does.
  //
  // Persisted, unlike creativeMode, and re-read on every navigation (see the
  // sync effect in CosmoChat). The first version read the URL exactly once, in
  // hydrate() — which runs on the FIRST consumer of this globally-mounted
  // provider, not on arrival at /dialog. Reaching /dialog?xenso=1 by a soft
  // navigation from /knowledge or /inception, both of which mount consumers,
  // meant hydrate had already run against a URL with no xenso param, and the
  // flag stayed false for the rest of the SPA session. Nothing surfaced that,
  // so it looked exactly like the feature not working.
  const [xensoMode, setXensoMode] = useState(false)
  const [pmError, setPmError] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const turnstileRef = useRef<TurnstileInstance>(null)
  // Tracks the last doc_path sent so we can detect document switches and
  // clear the RAG history window via doc_changed on the next request.
  const lastDocPathRef = useRef<string | null>(null)
  // Guard so the first consumer triggers hydration exactly once. Routes that
  // never call useCosmoSession (e.g. /account) skip all network + storage work.
  const hydratedRef = useRef(false)

  const hydrate = useCallback(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true

    const params = new URLSearchParams(window.location.search)
    setCreativeMode(params.get('creative') === '1')
    // The param wins when present; otherwise fall back to what was persisted,
    // so a reload or a hard navigation inside /dialog stays in the game.
    const xensoParam = params.get('xenso')
    setXensoMode(
      xensoParam === '1' ? true
      : xensoParam === '0' ? false
      : sessionStorage.getItem(KEY_XENSO) === '1'
    )
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

    fetch('/api/session')
      .then((r) => r.json())
      .then((data: { tokensUsed: number; tokenBudget: number; sessionExpiresAt: number }) => {
        setTokensUsed(data.tokensUsed)
        setTokenBudget(data.tokenBudget)
        setSessionExpiresAt(data.sessionExpiresAt)
      })
      .catch(() => {})

    fetch('/api/admin/auth')
      .then((r) => r.json())
      .then((data: { active: boolean }) => setPmMode(data.active))
      .catch(() => {})

    fetch('/api/auth/me')
      .then((r) => r.json())
      .then(async (data: { user: object | null }) => {
        if (!data.user) return
        setIsAuthenticated(true)

        if (localStorage.getItem(KEY_API_KEY)) {
          fetch('/api/byok', { method: 'POST' }).catch(() => {})
        }

        const res = await fetch('/api/conversations')
        if (!res.ok) return
        const { conversations: serverConvs } = (await res.json()) as { conversations: Conversation[] }

        const local = loadAll()

        const localOnly = Object.values(local).filter((c) => !serverConvs.find((s) => s.id === c.id))
        for (const conv of localOnly) {
          fetch('/api/conversations', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversation: conv }),
          }).catch(() => {})
        }

        if (serverConvs.length === 0) return

        const merged = { ...local }
        for (const conv of serverConvs) {
          merged[conv.id] = conv
        }
        localStorage.setItem(KEY_CONVERSATIONS, JSON.stringify(merged))
        setConversations(Object.values(merged).sort((a, b) => b.updatedAt - a.updatedAt))

        const fromServer = serverConvs.find((c) => c.id === id)
        if (fromServer && !local[fromServer.id]) {
          setMessages(fromServer.messages)
        }
      })
      .catch(() => {})

    setMounted(true)
  }, [])

  const refreshConversations = useCallback(() => {
    setConversations(Object.values(loadAll()).sort((a, b) => b.updatedAt - a.updatedAt))
  }, [])

  const isLimited = mounted && !apiKey && !pmMode && tokensUsed >= tokenBudget

  const send = useCallback(async (override?: string) => {
    const raw = override !== undefined ? override : input
    if (!raw.trim() || isStreaming || isLimited) return

    const content = raw.trim()
    if (override === undefined) setInput('')

    const newMessages: Message[] = [...messages, { role: 'user', content }]
    setMessages([...newMessages, { role: 'assistant', content: '' }])
    setIsStreaming(true)

    try {
      type StoredContext = { heading: string; passage?: string; doc_title: string; doc_path: string; timestamp: number }
      let currentSection: { heading: string; passage?: string; doc_title: string; doc_path: string } | undefined
      let docChanged = false
      try {
        const raw = sessionStorage.getItem('cosmo_context')
        if (raw) {
          const ctx = JSON.parse(raw) as StoredContext
          if (Date.now() - ctx.timestamp < 30 * 60 * 1000) {
            currentSection = { heading: ctx.heading, passage: ctx.passage, doc_title: ctx.doc_title, doc_path: ctx.doc_path }
            if (lastDocPathRef.current !== null && lastDocPathRef.current !== ctx.doc_path) {
              docChanged = true
            }
            lastDocPathRef.current = ctx.doc_path
          }
        }
      } catch {
        // sessionStorage unavailable — non-fatal
      }

      const isFreeTier = !apiKey && !pmMode

      // Wait for Turnstile to produce a token before posting on the free-tier
      // path. Without this, the landing-page handoff (`/dialog?q=…` auto-send)
      // fires before the invisible widget has finished its Cloudflare round-
      // trip — the request goes out with an empty token, the server rejects
      // with 403, and the user sees "Verification failed".
      let resolvedTurnstileToken = turnstileToken
      if (isFreeTier && !resolvedTurnstileToken) {
        const start = Date.now()
        while (Date.now() - start < 10_000) {
          if (turnstileRef.current) {
            try {
              resolvedTurnstileToken = await turnstileRef.current.getResponsePromise()
            } catch {
              // getResponsePromise rejects on timeout — leave token empty and
              // let the server's response drive the error message.
            }
            break
          }
          await new Promise((r) => setTimeout(r, 50))
        }
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          apiKey: apiKey || undefined,
          turnstileToken: isFreeTier ? resolvedTurnstileToken : undefined,
          current_section: currentSection,
          doc_changed: docChanged || undefined,
          creativeMode: pmMode && creativeMode ? true : undefined,
          // Not gated on pmMode: the module is the game, and the whole point of
          // this flag is that testers can be handed a link. The route forces
          // creativeMode off when this is set.
          xensoMode: xensoMode ? true : undefined,
        }),
      })

      if (res.status === 403) {
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: 'Verification failed — please refresh the page and try again.',
          }
          return updated
        })
        setIsStreaming(false)
        return
      }

      if (res.status === 429) {
        setTokensUsed(tokenBudget)
        setMessages((prev) => prev.slice(0, -1))
        setIsStreaming(false)
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

      const finalMessages: Message[] = [...newMessages, { role: 'assistant', content: assistantContent }]
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
      if (!apiKey && !pmMode) {
        turnstileRef.current?.reset()
        setTurnstileToken('')
      }
    }
  }, [
    input,
    isStreaming,
    isLimited,
    messages,
    apiKey,
    pmMode,
    creativeMode,
    xensoMode,
    currentId,
    refreshConversations,
    isAuthenticated,
    turnstileToken,
    tokenBudget,
  ])

  const saveKey = useCallback(() => {
    const key = apiKeyDraft.trim()
    if (!key) return
    localStorage.setItem(KEY_API_KEY, key)
    setApiKey(key)
    setApiKeyDraft('')
    fetch('/api/byok', { method: 'POST' }).catch(() => {})
  }, [apiKeyDraft])

  const activatePm = useCallback(async () => {
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
  }, [pmSecret])

  const deactivatePm = useCallback(async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    setPmMode(false)
    setShowPmInput(false)
  }, [])

  // setPmSecret clears any lingering error message — matches the original
  // keystroke-level clearing behaviour of the PM unlock input.
  const setPmSecretWithClear = useCallback((v: string) => {
    setPmSecret(v)
    setPmError('')
  }, [])

  // Called by the /dialog surface on every navigation, so ?xenso=1 takes effect
  // whenever it appears — not only if it happened to be present the one time
  // hydrate() ran. Persisted so it survives reload and "New dialog".
  const applyXensoMode = useCallback((on: boolean) => {
    setXensoMode(on)
    try {
      if (on) sessionStorage.setItem(KEY_XENSO, '1')
      else sessionStorage.removeItem(KEY_XENSO)
    } catch {
      // Private-mode storage failures must not break the session; the flag
      // still works for this page view, it just will not survive a reload.
    }
  }, [])

  const startNew = useCallback(() => {
    const id = crypto.randomUUID()
    localStorage.setItem(KEY_CURRENT_ID, id)
    setCurrentId(id)
    setMessages([])
  }, [])

  const openConversation = useCallback((conv: Conversation) => {
    localStorage.setItem(KEY_CURRENT_ID, conv.id)
    setCurrentId(conv.id)
    setMessages(conv.messages)
  }, [])

  const renameConversation = useCallback((id: string, title: string) => {
    const trimmed = title.trim()
    if (!trimmed) return
    const all = loadAll()
    const existing = all[id]
    if (!existing) return
    const updated: Conversation = { ...existing, title: trimmed }
    persist(updated)
    refreshConversations()
    if (isAuthenticated) {
      fetch('/api/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation: updated }),
      }).catch(() => {})
    }
  }, [refreshConversations, isAuthenticated])

  const deleteConversation = useCallback((id: string) => {
    remove(id)
    refreshConversations()
    if (id === currentId) {
      const newId = crypto.randomUUID()
      localStorage.setItem(KEY_CURRENT_ID, newId)
      setCurrentId(newId)
      setMessages([])
    }
    if (isAuthenticated) {
      fetch(`/api/conversations?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {})
    }
  }, [refreshConversations, isAuthenticated, currentId])

  const value = useMemo<CosmoSession>(
    () => ({
      mounted,
      messages,
      input,
      isStreaming,
      apiKey,
      apiKeyDraft,
      tokensUsed,
      tokenBudget,
      sessionExpiresAt,
      currentId,
      conversations,
      pmMode,
      showPmInput,
      pmSecret,
      pmError,
      creativeMode,
      xensoMode,
      isAuthenticated,
      isLimited,
      setInput,
      setApiKeyDraft,
      setShowPmInput,
      setPmSecret: setPmSecretWithClear,
      applyXensoMode,
      send,
      startNew,
      openConversation,
      renameConversation,
      deleteConversation,
      saveKey,
      activatePm,
      deactivatePm,
      hydrate,
    }),
    [
      mounted,
      messages,
      input,
      isStreaming,
      apiKey,
      apiKeyDraft,
      tokensUsed,
      tokenBudget,
      sessionExpiresAt,
      currentId,
      conversations,
      pmMode,
      showPmInput,
      pmSecret,
      pmError,
      creativeMode,
      xensoMode,
      isAuthenticated,
      isLimited,
      applyXensoMode,
      send,
      startNew,
      openConversation,
      renameConversation,
      deleteConversation,
      saveKey,
      activatePm,
      deactivatePm,
      setPmSecretWithClear,
      hydrate,
    ]
  )

  return (
    <CosmoSessionCtx.Provider value={value}>
      {/* Invisible Turnstile — only mounted after first consumer triggers hydrate,
          so routes like /account that never read the session don't pay for it. */}
      {mounted && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
        <Turnstile
          ref={turnstileRef}
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
          onSuccess={setTurnstileToken}
          options={{ size: 'invisible' }}
        />
      )}
      {children}
    </CosmoSessionCtx.Provider>
  )
}

export function useCosmoSession(): CosmoSession {
  const ctx = useContext(CosmoSessionCtx)
  if (!ctx) throw new Error('useCosmoSession must be used within CosmoSessionProvider')
  // Trigger hydration once on first consumer mount. Subsequent consumers no-op
  // via the internal hydratedRef guard.
  useEffect(() => {
    ctx.hydrate()
  }, [ctx.hydrate])
  return ctx
}

export type { Message, Conversation }
