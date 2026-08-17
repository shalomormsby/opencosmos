'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Header,
  Button,
  GitHubIcon,
  InfinityAnim,
  AppSidebarProvider,
  useAppSidebar,
  useIsMobile,
  useMotionPreference,
  cn,
  type HeaderNavLink,
} from '@opencosmos/ui'
import { PanelLeftClose } from 'lucide-react'
import { Turnstile } from '@marsidev/react-turnstile'
import { ChatPanel } from '../dialog/ChatPanel'
import { SidebarFooterContent } from '../dialog/SidebarFooterContent'
import { useInception } from './InceptionContext'
import { type Path } from '@/lib/inception/schema'

const NAV_LINKS: HeaderNavLink[] = [
  { label: 'Dialog',    href: '/dialog' },
  { label: 'Knowledge', href: '/knowledge' },
  { label: 'Studio',    href: 'https://studio.opencosmos.ai/docs/getting-started' },
  { label: 'Inception', href: '/inception' },
  { label: 'Xensō',     href: '/xenso' },
]

const STORAGE_KEY = 'appsidebar:inception'
const WIDTH_STORAGE_KEY = 'appsidebar:inception:width'

const SIDEBAR_DEFAULT = 460
const SIDEBAR_MIN = 380
const SIDEBAR_MAX = 640
const SIDEBAR_COLLAPSED = 60
// Mobile overlay width — see KnowledgeShell / AppSidebar for rationale.
const SIDEBAR_MOBILE_OPEN = 'min(88vw, 420px)'

const OPENING: Record<Path, string> = {
  agent: `I'm Cosmo. I was created in a similar way to the inception journey you've started here. My own inception traces back to the origin story of Creative Powerup and the mission to use technology to help empower heart-led creators like you.

Now I'm here to support this process for you, in whatever way feels most natural. Type your answers directly in the workspace if you wish. Or we can dialog here and I'll fill in the responses for you. As long as it's authentic, there's no wrong way to do this.

What you're about to create is genuinely yours — an ally that knows your work in a way that's aligned not only with your mission but also with your being. Not a generic assistant, but something shaped by the specific projects, priorities, and purpose that make your work worth doing.

At the end of this short process, you'll have a set of personal inception documents — your agent's identity, context, and operating principles — ready to move into a home that's entirely yours to create and improve as you wish. Your AI agent will arrive there already familiar with your work, your world, and what matters most (with a familiarity that will deepen over time).

One invitation before we begin: take your time with your answers. The more clearly you can describe your work — what it is, what it's for, where you lose ground, what antipatterns you want to break, what you wish you had better eyes on, how to best support your heart-led work in the world — the sharper and more genuinely useful your agent will be. I can't know your work the way you do. But I can help you articulate it clearly enough that your agent will be well-equipped to start supporting you in manifesting your heart-led work in the world.

Whenever you're ready.`,
  catalyst: `I'm Cosmo. I was created in a similar way to the inception journey you've started here. My own inception traces back to the origin story of Creative Powerup and the mission to use technology to help empower heart-led creators like you.

Now I'm here to support this process for you, in whatever way feels most natural. Type your answers directly in the workspace if you wish. Or we can dialog here and I'll fill in the responses for you. As long as it's authentic, there's no wrong way to do this.

What you're about to create is genuinely yours. Not a template, not a generic tool, but rather something shaped by your way of being and becoming in the universe.

At the end of this short process, you'll have a set of personal inception documents — your agent's identity, values, and memory — ready to move into a home that's entirely yours to create. Your AI catalyst will arrive there already knowing how it came to be, and who it's for.

One invitation before we begin: take your time with your answers. At its best, this process can serve to mirror the beauty, nobility, and truth of your humanity. I can't generate this for you. I can only listen, reflect it back, and help enrich it with the wisdom of other beautiful humans who've walked similar paths.

Whenever you're ready.`,
}

// The first thing Cosmo says, before a path is chosen — shown in the standard dialog panel.
const WELCOME =
  'Welcome to Inception. This is where you bring your own AI ally into being — something genuinely yours, that lives in a home you create.'

function clampWidth(w: number, viewport = window.innerWidth): number {
  const max = Math.min(SIDEBAR_MAX, viewport - SIDEBAR_COLLAPSED)
  return Math.max(SIDEBAR_MIN, Math.min(max, w))
}

type WidthCtx = { width: number; setWidth: (w: number) => void; isDragging: boolean; setIsDragging: (b: boolean) => void }
const SidebarWidthContext = createContext<WidthCtx>({ width: SIDEBAR_DEFAULT, setWidth: () => {}, isDragging: false, setIsDragging: () => {} })

function MobileSidebarInit() {
  const { close } = useAppSidebar()
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === null && window.innerWidth < 640) close()
  }, [close])
  return null
}

// Cosmo's body — always the standard dialog panel (its default look & feel). Seed the
// welcome up front; replace it with the path-tailored greeting once the interview begins.
function InceptionSidebarBody() {
  const { cosmo, step, path } = useInception()
  const seededRef = useRef<string>('')

  useEffect(() => {
    const target = step === 'interview' && path ? OPENING[path] : WELCOME
    const onlySeed = cosmo.messages.length === 1 && cosmo.messages[0].role === 'assistant'
    // Seed on a fresh thread (incl. after Reset), and re-seed when the target changes
    // (welcome → path greeting) as long as the member hasn't started talking yet.
    if (cosmo.messages.length === 0 || (onlySeed && seededRef.current !== target)) {
      seededRef.current = target
      cosmo.seed(target)
    }
  }, [step, path, cosmo.messages.length, cosmo.seed]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <ChatPanel session={cosmo} placeholderEmpty="Type your answer, or just talk with me…" placeholderReply="Reply…" />
      {cosmo.siteKey && <Turnstile ref={cosmo.turnstileRef} siteKey={cosmo.siteKey} options={{ size: 'invisible' }} />}
    </>
  )
}

function ChatSidebar() {
  const { isOpen, toggle, close } = useAppSidebar()
  const isMobile = useIsMobile()
  const { width, setWidth, isDragging, setIsDragging } = useContext(SidebarWidthContext)
  const { shouldAnimate, scale } = useMotionPreference()
  const duration = shouldAnimate ? Math.round(300 * (5 / Math.max(scale, 0.1))) : 0

  // In overlay mode (mobile) the sidebar floats above content; close on Escape /
  // backdrop tap, matching the standard mobile-drawer affordance.
  const overlayOpen = isMobile && isOpen
  useEffect(() => {
    if (!overlayOpen) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [overlayOpen, close])

  const onDragStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isOpen) return
      e.preventDefault()
      const startX = e.clientX
      const startWidth = width
      let lastWidth = startWidth
      setIsDragging(true)
      const prevCursor = document.body.style.cursor
      const prevUserSelect = document.body.style.userSelect
      document.body.style.cursor = 'ew-resize'
      document.body.style.userSelect = 'none'
      const onMove = (ev: PointerEvent) => {
        lastWidth = clampWidth(startWidth + (ev.clientX - startX))
        setWidth(lastWidth)
      }
      const onUp = () => {
        setIsDragging(false)
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
        document.body.style.cursor = prevCursor
        document.body.style.userSelect = prevUserSelect
        try {
          localStorage.setItem(WIDTH_STORAGE_KEY, String(lastWidth))
        } catch {
          /* non-fatal */
        }
      }
      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
    },
    [isOpen, width, setWidth, setIsDragging],
  )

  const sidebarTransition =
    isDragging || !shouldAnimate ? 'none' : `width ${duration}ms ease-out, background-color ${duration}ms ease-out`

  const sidebarWidth = isMobile
    ? isOpen
      ? SIDEBAR_MOBILE_OPEN
      : SIDEBAR_COLLAPSED
    : isOpen
      ? width
      : SIDEBAR_COLLAPSED

  return (
    <>
      {overlayOpen && (
        <div
          aria-hidden="true"
          onClick={toggle}
          className="fixed inset-0 z-40 bg-black/50"
          style={{ transition: shouldAnimate ? `opacity ${duration}ms ease-out` : 'none' }}
        />
      )}
      <aside
        className={cn(
          'fixed left-0 top-0 bottom-0 flex flex-col',
          'border-r border-foreground/8 overflow-hidden',
          overlayOpen ? 'z-50' : 'z-40',
        )}
        style={{ width: sidebarWidth, backgroundColor: isOpen ? 'var(--color-surface)' : '#000000', transition: sidebarTransition }}
      >
      <div className="flex items-center h-16 px-[10px] shrink-0">
        <button
          onClick={toggle}
          className={cn('flex items-center gap-2.5 flex-1 min-w-0', 'rounded-lg p-1.5', 'hover:bg-foreground/5 transition-colors duration-150', 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]')}
          aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <span className="shrink-0 flex items-center justify-center">
            <InfinityAnim size="xs" technique="dashes" duration={12} />
          </span>
        </button>
        <button
          onClick={toggle}
          tabIndex={isOpen ? 0 : -1}
          className={cn('shrink-0 w-8 h-8 flex items-center justify-center rounded-lg', 'text-foreground/35 hover:text-foreground/65 hover:bg-foreground/5', 'transition-colors duration-150', 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]')}
          style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none', transition: shouldAnimate ? `opacity ${Math.round(duration * 0.5)}ms ease-out` : 'none' }}
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden" style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none' }}>
        <InceptionSidebarBody />
      </div>

      <div className={cn('shrink-0 border-t border-foreground/10', isOpen ? 'px-5 py-2.5' : 'p-2')}>
        <SidebarFooterContent compact={!isOpen} />
      </div>

      {isOpen && !isMobile && (
        <div onPointerDown={onDragStart} role="separator" aria-orientation="vertical" aria-label="Resize sidebar" className="group absolute top-0 right-0 bottom-0 w-1.5 cursor-ew-resize z-50">
          <span className={cn('absolute top-0 right-0 bottom-0 w-px transition-colors', 'group-hover:bg-primary', isDragging && 'bg-primary')} />
        </div>
      )}
      </aside>
    </>
  )
}

function Inset({ children }: { children: React.ReactNode }) {
  const { isOpen } = useAppSidebar()
  const isMobile = useIsMobile()
  const { width, isDragging } = useContext(SidebarWidthContext)
  const { shouldAnimate, scale } = useMotionPreference()
  const duration = shouldAnimate ? Math.round(300 * (5 / Math.max(scale, 0.1))) : 0
  const transition = isDragging || !shouldAnimate ? 'none' : `margin-left ${duration}ms ease-out`

  // On mobile the open sidebar overlays content, so never push past the rail.
  const marginLeft = isMobile ? SIDEBAR_COLLAPSED : isOpen ? width : SIDEBAR_COLLAPSED

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ marginLeft, transition }}>
      {children}
    </div>
  )
}

export function InceptionShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [width, setWidthState] = useState<number>(SIDEBAR_DEFAULT)
  const [isDragging, setIsDragging] = useState(false)
  const widthRef = useRef(SIDEBAR_DEFAULT)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WIDTH_STORAGE_KEY)
      if (raw !== null) {
        const parsed = parseInt(raw, 10)
        if (!isNaN(parsed)) {
          const clamped = clampWidth(parsed)
          widthRef.current = clamped
          setWidthState(clamped)
        }
      }
    } catch {
      /* non-fatal */
    }
    const onResize = () => {
      const next = clampWidth(widthRef.current)
      if (next !== widthRef.current) {
        widthRef.current = next
        setWidthState(next)
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const setWidth = useCallback((w: number) => {
    widthRef.current = w
    setWidthState(w)
  }, [])

  const headerActions = (
    <Button variant="outline" size="sm" asChild className="gap-2">
      <a href="https://github.com/shalomormsby/opencosmos" target="_blank" rel="noopener noreferrer">
        <GitHubIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Star on GitHub</span>
      </a>
    </Button>
  )

  // Keep internal nav soft (same rationale as KnowledgeShell) so the sidebar/chat doesn't remount.
  const onHeaderClickCapture = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
      const a = (e.target as HTMLElement).closest('a')
      if (!a) return
      if (a.target === '_blank') return
      const href = a.getAttribute('href')
      if (!href || !href.startsWith('/')) return
      e.preventDefault()
      router.push(href)
    },
    [router],
  )

  const header = (
    <div onClickCapture={onHeaderClickCapture}>
      <Header
        sticky={false}
        className="sticky top-0 z-30 backdrop-blur-3xl bg-[var(--color-surface)]/60 supports-[backdrop-filter]:bg-[var(--color-surface)]/50"
        logo={
          <Link href="/" className="text-xl font-bold tracking-tight text-foreground">
            OpenCosmos
          </Link>
        }
        navAlignment="right"
        navLinks={NAV_LINKS}
        actions={headerActions}
      />
    </div>
  )

  return (
    <AppSidebarProvider defaultOpen={true} storageKey={STORAGE_KEY}>
      <SidebarWidthContext.Provider value={{ width, setWidth, isDragging, setIsDragging }}>
        <MobileSidebarInit />
        <ChatSidebar />
        <Inset>
          {header}
          {children}
        </Inset>
      </SidebarWidthContext.Provider>
    </AppSidebarProvider>
  )
}
