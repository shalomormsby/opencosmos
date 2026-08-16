'use client'

/**
 * GraphPageClient — client component that orchestrates:
 *   1. SVG skeleton from SSR preview data (visible immediately)
 *   2. Web Worker fetch + parse of the full constellation payload
 *   3. Crossfade from skeleton → live constellation renderer
 *   4. The arrival: a gentle tween from the full corpus toward the reader's corner
 *   5. Tier-aware navigation on node click
 *
 * KnowledgeGraph is dynamically imported here (not passed as a prop from
 * the server component — functions can't cross the server/client boundary).
 * ssr: false is required because cosmos.gl instantiates WebGL on mount.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import {
  DEFAULT_TIER_COLORS,
  usePrefersReducedMotion,
  type ConstellationData,
  type ConstellationNode,
  type KnowledgeGraphProps,
} from '@opencosmos/constellation'
import { DOMAIN_COLORS } from './domain-colors'
import { nodeHref, nodeIdFromDocPath } from './nodeHref'

// Dynamic import lives in the Client Component — Next.js App Router rule:
// component functions cannot be passed as props from Server → Client components.
const KnowledgeGraph = dynamic<KnowledgeGraphProps>(
  () => import('@opencosmos/constellation').then((m) => m.KnowledgeGraph),
  { ssr: false },
)

/** Top-40-by-degree subset written to `knowledge:constellation:preview`. */
export interface ConstellationPreview {
  nodes: Array<Pick<ConstellationNode, 'id' | 'x' | 'y' | 'degree' | 'tier' | 'tradition' | 'domain'>>
  generatedAt: number
}

interface GraphPageClientProps {
  preview: ConstellationPreview | null
}

/** How long the full corpus is left to itself before the camera drifts inward. */
const ARRIVAL_DELAY_MS = 2500
/** Reader context older than this is stale enough that arriving there would confuse. */
const CONTEXT_TTL_MS = 30 * 60 * 1000

/**
 * Where the camera should come to rest, if anywhere: an explicit `?focus=`,
 * else the doc the reader last had open (the same `cosmo_context` channel the
 * chat panel reads), else nowhere — the full corpus is a fine place to be.
 */
function resolveArrivalTarget(): string | null {
  if (typeof window === 'undefined') return null

  const requested = new URLSearchParams(window.location.search).get('focus')
  if (requested) return requested

  try {
    const raw = sessionStorage.getItem('cosmo_context')
    if (!raw) return null
    const ctx = JSON.parse(raw) as { doc_path?: string; timestamp?: number }
    if (!ctx.doc_path) return null
    if (ctx.timestamp && Date.now() - ctx.timestamp > CONTEXT_TTL_MS) return null
    return nodeIdFromDocPath(ctx.doc_path)
  } catch {
    return null
  }
}

export function GraphPageClient({ preview }: GraphPageClientProps) {
  const router = useRouter()
  const containerRef                        = useRef<HTMLDivElement>(null)
  const [graphData, setGraphData]           = useState<ConstellationData | null>(null)
  const [showSkeleton, setShowSkeleton]     = useState(true)
  const [containerReady, setContainerReady] = useState(false)
  const [error, setError]                   = useState<string | null>(null)
  const [focus, setFocus]                   = useState<string | null>(null)

  const prefersReducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    // Create worker inside useEffect — terminated in cleanup regardless of fetch state.
    // DO NOT call worker.terminate() inside onmessage; that leaks the worker on early unmount.
    const worker = new Worker(new URL('./graphWorker.ts', import.meta.url))

    worker.onmessage = (e: MessageEvent<{ data?: ConstellationData; error?: string }>) => {
      if (e.data.error) {
        setError(e.data.error)
        return
      }
      if (e.data.data) {
        setGraphData(e.data.data)
        setTimeout(() => setShowSkeleton(false), 100)
      }
    }

    worker.postMessage({ origin: location.origin })

    return () => worker.terminate()
  }, [])

  // Gate the renderer mount until the container has real dimensions. cosmos.gl
  // computes its viewport matrices at init — a zero-height container produces
  // degenerate matrices and renders nothing. ResizeObserver fires as soon as
  // layout gives the div height.
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    if (el.clientHeight > 0) {
      setContainerReady(true)
      return
    }
    const ro = new ResizeObserver(() => {
      if (el.clientHeight > 0) {
        setContainerReady(true)
        ro.disconnect()
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ─── The arrival ────────────────────────────────────────────────────────────
  // Land on the whole corpus, let it be looked at, then drift toward the
  // reader's own corner of it. Any interaction means they've chosen their own
  // direction — cancel, and don't move the camera under them.
  useEffect(() => {
    if (!graphData || !containerReady) return

    const target = resolveArrivalTarget()
    if (!target) return
    if (!graphData.nodes.some((n) => n.id === target)) return

    let cancelled = false
    const arrive = () => { if (!cancelled) setFocus(target) }

    // Reduced motion: no slow approach, just be there.
    if (prefersReducedMotion) {
      arrive()
      return
    }

    const timer = setTimeout(arrive, ARRIVAL_DELAY_MS)
    const cancel = () => { cancelled = true; clearTimeout(timer) }

    const el = containerRef.current
    el?.addEventListener('pointerdown', cancel, { once: true })
    el?.addEventListener('wheel', cancel, { once: true, passive: true })

    return () => {
      clearTimeout(timer)
      el?.removeEventListener('pointerdown', cancel)
      el?.removeEventListener('wheel', cancel)
    }
  }, [graphData, containerReady, prefersReducedMotion])

  const tierOf = useMemo(() => {
    const map = new Map<string, ConstellationNode['tier']>()
    graphData?.nodes.forEach((n) => map.set(n.id, n.tier))
    return map
  }, [graphData])

  const handleNodeClick = useCallback((nodeId: string) => {
    const tier = tierOf.get(nodeId)
    if (!tier) return

    const destination = nodeHref(nodeId, tier)
    switch (destination.kind) {
      case 'route':    router.push(destination.href); break
      case 'external': window.open(destination.href, '_blank', 'noopener,noreferrer'); break
      // Traditions and domains have no page — frame the cluster instead.
      case 'focus':    setFocus(nodeId); break
    }
  }, [router, tierOf])

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* SVG skeleton — visible immediately from SSR preview data */}
      {preview && (
        <div
          className="absolute inset-0 transition-opacity duration-[600ms]"
          style={{ opacity: showSkeleton ? 1 : 0, pointerEvents: 'none', zIndex: 1 }}
        >
          <SkeletonGraph preview={preview} />
        </div>
      )}

      {/* Live graph — fades in when the Worker finishes AND the container has real height */}
      {graphData && containerReady && (
        <div
          className="absolute inset-0 transition-opacity duration-[600ms]"
          style={{ opacity: showSkeleton ? 0 : 1, zIndex: 2 }}
        >
          <KnowledgeGraph
            data={graphData}
            onNodeClick={handleNodeClick}
            tierColors={DEFAULT_TIER_COLORS}
            focus={focus}
            focusRadius={1}
            ambientDrift
            className="w-full h-full"
          />
        </div>
      )}

      {/* Error state */}
      {error && !graphData && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center text-foreground/40 px-6">
            <p className="text-sm mb-2">Graph unavailable</p>
            <p className="text-xs">{error}</p>
            <p className="text-xs mt-3">
              Run{' '}
              <code className="font-mono bg-foreground/10 px-1 py-0.5 rounded">
                pnpm graph:constellation
              </code>{' '}
              to generate the knowledge graph.
            </p>
          </div>
        </div>
      )}

      {/* Loading state — no preview, no data yet */}
      {!preview && !graphData && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-foreground/30">
            <div className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-pulse" />
            <p className="text-xs">Loading knowledge graph…</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── SVG skeleton ─────────────────────────────────────────────────────────────

function SkeletonGraph({ preview }: { preview: ConstellationPreview }) {
  if (!preview.nodes.length) return null

  const xs     = preview.nodes.map((n) => n.x)
  const ys     = preview.nodes.map((n) => n.y)
  const minX   = Math.min(...xs)
  const maxX   = Math.max(...xs)
  const minY   = Math.min(...ys)
  const maxY   = Math.max(...ys)
  const rangeX = maxX - minX || 1
  const rangeY = maxY - minY || 1

  // Rounded to 3dp: Math.log()'s last bit differs between the server's and the
  // browser's libm, and React compares the serialized attribute strings — an
  // unrounded radius is a guaranteed hydration mismatch on every node.
  const round = (v: number) => Math.round(v * 1000) / 1000

  const normalized = preview.nodes.map((n) => {
    const r = round(Math.max(1.5, Math.log((n.degree ?? 0) + 1) * 1.2))
    return {
      ...n,
      nx:   round(((n.x - minX) / rangeX) * 90 + 5),
      ny:   round(((n.y - minY) / rangeY) * 90 + 5),
      r,
      glow: round(r * 3),
    }
  })

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-full"
      style={{ background: 'var(--background)' }}
      aria-hidden="true"
    >
      <defs>
        {normalized.map(({ id, domain }) => {
          const color = DOMAIN_COLORS[domain ?? 'default'] ?? DOMAIN_COLORS['default'] ?? '#8b949e'
          return (
            <radialGradient key={`glow-${id}`} id={`glow-${safeGradientId(id)}`}>
              <stop offset="0%"   stopColor={color} stopOpacity="0.6" />
              <stop offset="60%"  stopColor={color} stopOpacity="0.15" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </radialGradient>
          )
        })}
      </defs>

      {normalized.map(({ id, nx, ny, r, glow, domain }) => {
        const color = DOMAIN_COLORS[domain ?? 'default'] ?? DOMAIN_COLORS['default'] ?? '#8b949e'
        return (
          <g key={id}>
            <circle cx={nx} cy={ny} r={glow} fill={`url(#glow-${safeGradientId(id)})`} opacity="0.4" />
            <circle cx={nx} cy={ny} r={r}    fill={color}                              opacity="0.7" />
          </g>
        )
      })}
    </svg>
  )
}

/**
 * Constellation ids carry `/`, `.` and `#` (e.g. `knowledge/sources/x.md#the-good`).
 * All three break an SVG fragment reference, so reduce to a safe token.
 */
function safeGradientId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '-')
}
