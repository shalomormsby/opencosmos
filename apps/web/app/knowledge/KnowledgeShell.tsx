'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Header,
  Button,
  GitHubIcon,
  OpenCosmosIcon,
  AppSidebarProvider,
  useAppSidebar,
  useMotionPreference,
  cn,
  type HeaderNavLink,
} from '@opencosmos/ui'
import { PanelLeftClose } from 'lucide-react'
import { CosmoSidebarContent } from './CosmoSidebarContent'
import { SidebarFooterContent } from '../dialog/SidebarFooterContent'

const NAV_LINKS: HeaderNavLink[] = [
  { label: 'Dialog',    href: '/dialog' },
  { label: 'Knowledge', href: '/knowledge' },
  { label: 'Studio',    href: 'https://studio.opencosmos.ai/docs/getting-started' },
]

const STORAGE_KEY = 'appsidebar:knowledge'
const WIDTH_STORAGE_KEY = 'appsidebar:knowledge:width'

const SIDEBAR_DEFAULT = 500
const SIDEBAR_MIN = 400
const SIDEBAR_MAX = 720
const SIDEBAR_COLLAPSED = 60

// Cap to viewport so a remembered width can't exceed available space.
function clampWidth(w: number, viewport = window.innerWidth): number {
  const max = Math.min(SIDEBAR_MAX, viewport - SIDEBAR_COLLAPSED)
  return Math.max(SIDEBAR_MIN, Math.min(max, w))
}

// Shares the user-chosen expanded width between sidebar and inset, plus the
// drag flag so both can suppress transitions during a drag.
type WidthCtx = {
  width: number
  setWidth: (w: number) => void
  isDragging: boolean
  setIsDragging: (b: boolean) => void
}
const SidebarWidthContext = createContext<WidthCtx>({
  width: SIDEBAR_DEFAULT,
  setWidth: () => {},
  isDragging: false,
  setIsDragging: () => {},
})

// Auto-collapse on first visit to narrow viewports — matches the /dialog pattern.
function MobileSidebarInit() {
  const { close } = useAppSidebar()
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === null && window.innerWidth < 640) close()
  }, [close])
  return null
}

function ChatSidebar() {
  const { isOpen, toggle } = useAppSidebar()
  const { width, setWidth, isDragging, setIsDragging } = useContext(SidebarWidthContext)
  const { shouldAnimate, scale } = useMotionPreference()
  const duration = shouldAnimate ? Math.round(300 * (5 / Math.max(scale, 0.1))) : 0

  const onDragStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isOpen) return
      e.preventDefault()
      const startX = e.clientX
      const startWidth = width
      let lastWidth = startWidth
      setIsDragging(true)

      // Lock the cursor + selection while dragging so the UX stays consistent
      // even if the pointer wanders off the 4px handle.
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
          // storage unavailable — non-fatal
        }
      }
      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
    },
    [isOpen, width, setWidth, setIsDragging],
  )

  // Suppress width transition while dragging so the handle tracks the cursor
  // 1:1; restore the eased transition for open/collapse toggles. Background
  // also fades between surface (open) and pure black (collapsed) on toggle.
  const sidebarTransition =
    isDragging || !shouldAnimate
      ? 'none'
      : `width ${duration}ms ease-out, background-color ${duration}ms ease-out`

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 bottom-0 z-40 flex flex-col',
        'border-r border-foreground/8 overflow-hidden',
      )}
      style={{
        width: isOpen ? width : SIDEBAR_COLLAPSED,
        backgroundColor: isOpen ? 'var(--color-surface)' : '#000000',
        transition: sidebarTransition,
      }}
    >
      {/* Top bar — logo button + collapse button. Mirrors AppSidebar layout. */}
      <div className="flex items-center h-16 px-[10px] shrink-0">
        <button
          onClick={toggle}
          className={cn(
            'flex items-center gap-2.5 flex-1 min-w-0',
            'rounded-lg p-1.5',
            'hover:bg-foreground/5 transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]',
          )}
          aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <span className="w-8 h-8 shrink-0 flex items-center justify-center">
            <OpenCosmosIcon size={20} />
          </span>
        </button>
        <button
          onClick={toggle}
          tabIndex={isOpen ? 0 : -1}
          className={cn(
            'shrink-0 w-8 h-8 flex items-center justify-center rounded-lg',
            'text-foreground/35 hover:text-foreground/65 hover:bg-foreground/5',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]',
          )}
          style={{
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? 'auto' : 'none',
            transition: shouldAnimate ? `opacity ${Math.round(duration * 0.5)}ms ease-out` : 'none',
          }}
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Body — chat panel. Hidden when collapsed so only the icon shows. */}
      <div
        className="flex-1 min-h-0 overflow-hidden"
        style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none' }}
      >
        <CosmoSidebarContent />
      </div>

      {/* Footer — always rendered so the account button stays visible in the
          collapsed rail (parity with /dialog's AppSidebar). Compact mode shrinks
          to just the avatar centered, matching the rail width. */}
      <div
        className={cn(
          'shrink-0 border-t border-foreground/10',
          isOpen ? 'px-5 py-2.5' : 'p-2',
        )}
      >
        <SidebarFooterContent compact={!isOpen} />
      </div>

      {/* Drag handle — 6px hit target on the right edge. The 1px visible bar
          sits flush with the existing border-r and lights up on hover/drag. */}
      {isOpen && (
        <div
          onPointerDown={onDragStart}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          className="group absolute top-0 right-0 bottom-0 w-1.5 cursor-ew-resize z-50"
        >
          <span
            className={cn(
              'absolute top-0 right-0 bottom-0 w-px transition-colors',
              'group-hover:bg-primary',
              isDragging && 'bg-primary',
            )}
          />
        </div>
      )}
    </aside>
  )
}

function Inset({ children }: { children: React.ReactNode }) {
  const { isOpen } = useAppSidebar()
  const { width, isDragging } = useContext(SidebarWidthContext)
  const { shouldAnimate, scale } = useMotionPreference()
  const duration = shouldAnimate ? Math.round(300 * (5 / Math.max(scale, 0.1))) : 0

  const transition =
    isDragging || !shouldAnimate ? 'none' : `margin-left ${duration}ms ease-out`

  return (
    <div
      className="min-h-screen bg-background"
      style={{
        marginLeft: isOpen ? width : SIDEBAR_COLLAPSED,
        transition,
      }}
    >
      {children}
    </div>
  )
}

export function KnowledgeShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [width, setWidthState] = useState<number>(SIDEBAR_DEFAULT)
  const [isDragging, setIsDragging] = useState(false)
  const widthRef = useRef(SIDEBAR_DEFAULT)

  // Hydrate from localStorage and re-clamp on viewport changes.
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
      // non-fatal
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
      <a
        href="https://github.com/shalomormsby/opencosmos"
        target="_blank"
        rel="noopener noreferrer"
      >
        <GitHubIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Star on GitHub</span>
      </a>
    </Button>
  )

  // The shared @opencosmos/ui Header renders nav links as plain <a> tags.
  // From a /knowledge/[...slug] doc, clicking the "Knowledge" nav link would
  // therefore trigger a full reload and remount the chat sidebar. We intercept
  // internal-href anchor clicks at the capture phase and route them via
  // router.push so navigation inside the segment stays soft. External links,
  // target="_blank", and modifier-click (cmd/ctrl/shift, middle button) all
  // pass through unchanged.
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
