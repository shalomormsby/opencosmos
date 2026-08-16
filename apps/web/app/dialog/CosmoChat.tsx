'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Header, Button, Input, cn, AppSidebar, AppSidebarProvider, AppSidebarInset, InfinityAnim, useAppSidebar, APP_SIDEBAR_WIDTH, APP_SIDEBAR_WIDTH_COLLAPSED, APP_SIDEBAR_MOBILE_BREAKPOINT, useMotionPreference } from '@opencosmos/ui'
import Link from 'next/link'
import { MessageSquare, BookOpen, ExternalLink, Sparkles } from 'lucide-react'
import { AuthButton } from '../AuthButton'
import { useCosmoSession } from './useCosmoSession'
import { SidebarFooterContent } from './SidebarFooterContent'
import { DialogHistoryPanel } from './DialogHistoryPanel'
import { chatMarkdownComponents, citationUrlTransform, preprocessCitations } from './citations'

// Shared liquid glass style — matches the header's always-on glass.
// The `!` modifier is load-bearing on the Header element: @opencosmos/ui's
// <Header glassOnScroll={false}> hard-codes `bg-transparent backdrop-blur-xl`
// internally, and those classes are defined *later* in Tailwind v4's CSS source
// order than `bg-[var(--color-surface)]/*` and `backdrop-blur-3xl` — so without
// `!important` the Header's transparent bg wins over whatever className we pass.
// Fallback opacity is set high enough that even if the compositor briefly drops
// the backdrop-filter pass during streaming repaints, underlying text stays
// masked rather than flashing through.
const glass = 'backdrop-blur-3xl! bg-[var(--color-surface)]/90! supports-[backdrop-filter]:bg-[var(--color-surface)]/75!'

function ContextAwareFooter() {
  const { isOpen } = useAppSidebar()
  return <SidebarFooterContent compact={!isOpen} />
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
// stays usable. If the user has previously set an explicit preference, it's
// respected and this does nothing. Matches AppSidebar's own overlay breakpoint
// so a first-time visitor never loads with the overlay stuck open.
function MobileSidebarInit({ storageKey }: { storageKey: string }) {
  const { close } = useAppSidebar()
  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    if (stored === null && window.innerWidth < APP_SIDEBAR_MOBILE_BREAKPOINT) close()
  }, [close, storageKey])
  return null
}

export function CosmoChat() {
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
    xensoMode,
    setInput,
    setApiKeyDraft,
    setShowPmInput,
    setPmSecret,
    applyXensoMode,
    send,
    saveKey,
    activatePm,
  } = useCosmoSession()

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQueryHandledRef = useRef(false)
  // Sticky-bottom scroll. Default to auto-following the stream; if the user
  // scrolls UP while streaming, mark them as "interrupted" and stop yanking
  // them back. Resume auto-follow when they scroll back down far enough for
  // bottomRef to re-enter the viewport, or when they send a new message.
  const userInterruptedRef = useRef(false)
  const prevMessageCountRef = useRef(0)

  // Xensō mode, synced from the URL on every navigation rather than once at
  // session hydration. The provider is mounted globally and hydrates on its
  // first consumer, which may be /knowledge or /inception — so reading the
  // param only there missed it entirely for anyone who arrived by a soft
  // navigation, with no visible sign that it had. `?xenso=0` turns it off.
  useEffect(() => {
    const v = searchParams.get('xenso')
    if (v === '1') applyXensoMode(true)
    else if (v === '0') applyXensoMode(false)
  }, [searchParams, applyXensoMode])

  // Handoff from the landing page: ?q=… seeds and auto-sends a single message.
  // Strips the param afterwards so a refresh won't re-send.
  useEffect(() => {
    if (initialQueryHandledRef.current) return
    const q = searchParams.get('q')
    if (!q) return
    const trimmed = q.trim()
    if (!trimmed) return
    initialQueryHandledRef.current = true
    void send(trimmed)
    router.replace('/dialog')
  }, [searchParams, send, router])

  useEffect(() => {
    // Any upward scroll = user-initiated interruption. Programmatic auto-scroll
    // during streaming always scrolls downward as content grows, so it can't
    // false-trigger this.
    let lastY = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (y < lastY - 4) userInterruptedRef.current = true
      lastY = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    // bottomRef back in viewport (user scrolled down to the live edge) =
    // resume auto-follow. IntersectionObserver fires asynchronously and is
    // independent of the scroll handler, so the two signals can't deadlock.
    const ref = bottomRef.current
    if (!ref) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) userInterruptedRef.current = false
      },
      { rootMargin: '0px 0px 200px 0px' },
    )
    observer.observe(ref)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const grew = messages.length > prevMessageCountRef.current
    prevMessageCountRef.current = messages.length
    const lastMsg = messages[messages.length - 1]
    if (grew && lastMsg?.role === 'user') userInterruptedRef.current = false
    if (userInterruptedRef.current) return
    bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' })
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

  return (
    <AppSidebarProvider defaultOpen={true} storageKey="appsidebar:dialog">
      <MobileSidebarInit storageKey="appsidebar:dialog" />
      <AppSidebar
        logo={<InfinityAnim size="xs" technique="dashes" duration={12} />}
        bottomItems={[
          { icon: <MessageSquare className="w-4 h-4" />, label: 'Dialog',    href: '/dialog',                                           active: true },
          { icon: <BookOpen     className="w-4 h-4" />, label: 'Knowledge', href: '/knowledge' },
          { icon: <ExternalLink className="w-4 h-4" />, label: 'Studio',    href: 'https://studio.opencosmos.ai/docs/getting-started', external: true },
          { icon: <Sparkles     className="w-4 h-4" />, label: 'Inception', href: '/inception' },
        ]}
        footer={<ContextAwareFooter />}
      >
        <DialogHistoryPanel />
      </AppSidebar>

      <AppSidebarInset>
        <Header
          sticky={false}
          glassOnScroll={false}
          className="sticky top-0 z-40 backdrop-blur-3xl! bg-[var(--color-surface)]/90! supports-[backdrop-filter]:bg-[var(--color-surface)]/75!"
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
            { label: 'Inception', href: '/inception' },
          ]}
          actions={<AuthButton />}
        />

        {/* Xensō is a prompt-layer mode with no surface of its own yet, so without
            a marker there is no way to tell it apart from an ordinary dialog —
            which is exactly how the mode silently failing went unnoticed. Quiet
            by design: the game asks nothing of you, and neither should this. */}
        {xensoMode && (
          <div className="border-b border-foreground/10 px-6 py-2">
            <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
              <span className="text-xs uppercase tracking-widest text-foreground/40">Xensō</span>
              <Link
                href="/dialog?xenso=0"
                className="text-xs text-foreground/30 hover:text-foreground/60 transition-colors"
              >
                leave
              </Link>
            </div>
          </div>
        )}

        {showPmInput && !pmMode && (
          <div className="border-b border-foreground/10 px-6 py-3">
            <div className="max-w-2xl mx-auto flex gap-2 items-center">
              <input
                type="password"
                placeholder="Enter PM secret"
                value={pmSecret}
                onChange={(e) => setPmSecret(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && activatePm()}
                autoFocus
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground/30 outline-none border border-foreground/15 rounded-lg px-3 py-2 focus:border-foreground/30 transition-colors"
              />
              <Button variant="outline" size="sm" onClick={activatePm} disabled={!pmSecret.trim()}>
                Unlock
              </Button>
              <button
                onClick={() => { setShowPmInput(false); setPmSecret('') }}
                className="text-foreground/30 hover:text-foreground/60 transition-colors text-lg leading-none"
              >
                ✕
              </button>
            </div>
            {pmError && <p className="text-xs text-foreground/40 mt-1.5 max-w-2xl mx-auto">{pmError}</p>}
          </div>
        )}

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
                    'rounded-2xl px-5 py-4 text-sm leading-relaxed max-w-prose',
                    msg.role === 'user'
                      ? 'bg-foreground/8 text-foreground whitespace-pre-wrap'
                      : 'border border-foreground/10 text-foreground'
                  )}
                >
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={chatMarkdownComponents} urlTransform={citationUrlTransform}>
                      {preprocessCitations(msg.content)}
                    </ReactMarkdown>
                  ) : (
                    msg.content
                  )}
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
                {' '}below.
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
                placeholder={messages.length === 0 ? 'What would you like to explore?' : 'Reply...'}
                rows={1}
                disabled={isStreaming}
                className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-foreground/30 outline-none border border-foreground/15 rounded-xl px-4 py-3 leading-relaxed focus:border-foreground/30 transition-colors disabled:opacity-50 min-h-[48px] max-h-[160px] overflow-y-auto [field-sizing:content]"
              />
              <Button
                onClick={() => send()}
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
